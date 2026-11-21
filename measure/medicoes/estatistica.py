"""Análise estatística das medições.

Uso: npm run analyze   (ou: python medicoes/estatistica.py <pasta de resultados>)

Procedimento, igual para toda medida (Docs/plano-medicao.md, seção 8):
  1. estatística descritiva das execuções válidas, sem o bloco de aquecimento;
  2. Shapiro-Wilk sobre os resíduos e Levene;
  3. ANOVA + Tukey HSD se as duas premissas passarem; senão Kruskal-Wallis +
     Dunn com correção de Bonferroni;
  4. por par: valor p, diferença percentual e intervalo de confiança de 95%.
"""

import json
import sys
from itertools import combinations
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import scikit_posthocs as sp
import scipy
from matplotlib.ticker import FuncFormatter
from scipy import stats

ALPHA = 0.05
DISCARDED_BLOCKS = 1
FRAME_MS = 1000 / 60
BOOTSTRAP_SAMPLES = 10_000
SEED = 20261115

# Ordem e cor fixas por implementação: a cor acompanha a entidade em toda figura.
IMPLEMENTATIONS = {
    "context": ("Context API", "#2a78d6"),
    "redux": ("Redux", "#eb6834"),
    "zustand": ("Zustand", "#1baf7a"),
    "jotai": ("Jotai", "#eda100"),
}
LIBRARIES = ["redux", "zustand", "jotai"]
ALL = list(IMPLEMENTATIONS)
SCENARIOS = {"simultaneous": "simultâneo", "localized": "localizado"}

# medida: (rótulo do eixo, grupos do teste ou None para só descritiva, por atualização?)
RUNTIME_MEASURES = {
    "tick_medio_ms": ("Tempo de processamento por atualização (ms)", LIBRARIES, True),
    "thread_por_atualizacao_ms": ("Ocupação da thread principal por atualização (ms)", ALL, True),
    "duracao_total_ms": ("Tempo total das atualizações medidas (ms)", ALL, False),
    "render_total_ms": ("Tempo de renderização do React na execução (ms)", ALL, False),
    "render_medio_ms": ("Latência de renderização (ms)", None, True),
    "frame_mediana_ms": ("Mediana do tempo de frame (ms)", None, False),
    "frame_p95_ms": ("Percentil 95 do tempo de frame (ms)", None, False),
    "frames_atrasados_pct": ("Frames atrasados (%)", None, False),
    "tarefas_longas": ("Tarefas longas por execução", None, False),
    "bloqueio_ms": ("Tempo de bloqueio em tarefas longas (ms)", None, False),
    "heap_final_mb": ("Memória heap ao fim da execução (MB)", None, False),
}
LIGHTHOUSE_MEASURES = {
    "lcp_ms": ("LCP (ms)", ALL, False),
    "tbt_ms": ("TBT (ms)", ALL, False),
}

INK = "#0b0b0b"
INK_SECONDARY = "#52514e"
GRID = "#e4e3df"


def decimal_comma(value, _position=None):
    return f"{value:g}".replace(".", ",")


def describe(values):
    values = np.asarray(values, dtype=float)
    mean = values.mean()
    sd = values.std(ddof=1) if len(values) > 1 else 0.0

    return {
        "n": len(values),
        "media": mean,
        "desvio_padrao": sd,
        "cv_pct": 100 * sd / mean if mean != 0 else np.nan,
        "mediana": np.median(values),
        "p5": np.percentile(values, 5),
        "p95": np.percentile(values, 95),
        "minimo": values.min(),
        "maximo": values.max(),
    }


def bootstrap_mean_difference(a, b, rng):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    resampled_a = rng.choice(a, (BOOTSTRAP_SAMPLES, len(a))).mean(axis=1)
    resampled_b = rng.choice(b, (BOOTSTRAP_SAMPLES, len(b))).mean(axis=1)
    low, high = np.percentile(resampled_a - resampled_b, [2.5, 97.5])

    return low, high


def compare(groups, per_update, rng):
    """groups: {implementação: valores}. Devolve (linha do teste, linhas dos pares)."""
    names = list(groups)
    samples = [np.asarray(groups[name], dtype=float) for name in names]
    residuals = np.concatenate([sample - sample.mean() for sample in samples])
    test = {"grupos": " ".join(names)}

    if np.ptp(residuals) == 0 or min(len(sample) for sample in samples) < 3:
        # Sem variação dentro dos grupos (ou dados insuficientes) não há teste possível.
        test.update(teste="sem teste", motivo="medida sem variação ou com poucas execuções")
        omnibus_significant = False
        pair_p = None
    else:
        shapiro_p = stats.shapiro(residuals).pvalue
        levene_p = stats.levene(*samples).pvalue
        test.update(shapiro_p=shapiro_p, levene_p=levene_p)

        if shapiro_p > ALPHA and levene_p > ALPHA:
            result = stats.f_oneway(*samples)
            test.update(teste="ANOVA + Tukey HSD", estatistica=result.statistic, p=result.pvalue)
            matrix = stats.tukey_hsd(*samples).pvalue
        else:
            result = stats.kruskal(*samples)
            test.update(teste="Kruskal-Wallis + Dunn (Bonferroni)", estatistica=result.statistic, p=result.pvalue)
            matrix = sp.posthoc_dunn(samples, p_adjust="bonferroni").to_numpy()

        omnibus_significant = bool(result.pvalue < ALPHA)
        test["significativo"] = omnibus_significant
        pair_p = matrix

    pairs = []
    for i, j in combinations(range(len(names)), 2):
        mean_a, mean_b = samples[i].mean(), samples[j].mean()
        low, high = bootstrap_mean_difference(samples[i], samples[j], rng)
        p = float(pair_p[i][j]) if pair_p is not None else np.nan
        pair = {
            "a": names[i],
            "b": names[j],
            "media_a": mean_a,
            "media_b": mean_b,
            "diferenca": mean_a - mean_b,
            "diferenca_pct_sobre_b": 100 * (mean_a - mean_b) / mean_b if mean_b != 0 else np.nan,
            "ic95_inferior": low,
            "ic95_superior": high,
            "p_ajustado": p,
            # Um par só conta como diferente se o teste geral também indicou diferença.
            "significativo": bool(omnibus_significant and p < ALPHA),
        }
        if per_update:
            pair["diferenca_pct_do_frame"] = 100 * (mean_a - mean_b) / FRAME_MS
        pairs.append(pair)

    return test, pairs


def style_axes(ax):
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines[["left", "bottom"]].set_color(GRID)
    ax.tick_params(colors=INK_SECONDARY, length=0, labelsize=9)
    ax.yaxis.grid(True, color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.yaxis.set_major_formatter(FuncFormatter(decimal_comma))


def distribution_figure(groups, label, path, rng):
    """Uma caixa por implementação, com as execuções como pontos."""
    names = [name for name in ALL if name in groups]
    fig, ax = plt.subplots(figsize=(6.4, 3.6), dpi=200)
    means = [np.mean(groups[name]) for name in names]
    use_log = min(means) > 0 and max(means) / min(means) > 20

    for position, name in enumerate(names):
        values = np.asarray(groups[name], dtype=float)
        color = IMPLEMENTATIONS[name][1]
        ax.boxplot(
            values,
            positions=[position],
            widths=0.5,
            showfliers=False,
            patch_artist=True,
            boxprops={"facecolor": color + "26", "edgecolor": color, "linewidth": 1.2},
            medianprops={"color": color, "linewidth": 2},
            whiskerprops={"color": color, "linewidth": 1.2},
            capprops={"color": color, "linewidth": 1.2},
        )
        jitter = rng.uniform(-0.16, 0.16, len(values))
        ax.scatter(
            position + jitter, values, s=14, color=color, alpha=0.75,
            edgecolors="white", linewidths=0.5, zorder=3,
        )

    ax.set_xticks(range(len(names)), [IMPLEMENTATIONS[name][0] for name in names])
    ax.tick_params(axis="x", labelsize=10, colors=INK)
    ax.set_ylabel(label + ("\nescala logarítmica" if use_log else ""), color=INK, fontsize=9)
    style_axes(ax)
    if use_log:
        ax.set_yscale("log")
        ax.yaxis.set_major_formatter(FuncFormatter(decimal_comma))
    else:
        ax.set_ylim(bottom=0)
    fig.tight_layout()
    fig.savefig(path.with_suffix(".png"))
    fig.savefig(path.with_suffix(".pdf"))
    plt.close(fig)


def scale_figure(table, path):
    """Tempo de processamento em função do número de sensores, uma linha por biblioteca."""
    fig, ax = plt.subplots(figsize=(6.4, 3.8), dpi=200)
    sizes = sorted(table["sensores"].unique())

    for name in LIBRARIES:
        rows = table[table["implementacao"] == name].sort_values("sensores")
        if rows.empty:
            continue
        label, color = IMPLEMENTATIONS[name]
        ax.plot(rows["sensores"], rows["media"], color=color, linewidth=2, marker="o", markersize=7,
                markeredgecolor="white", markeredgewidth=1, label=label)
        ax.annotate(label, (rows["sensores"].iloc[-1], rows["media"].iloc[-1]), xytext=(8, 0),
                    textcoords="offset points", va="center", fontsize=9, color=INK)

    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xticks(sizes, [f"{size:,}".replace(",", ".") for size in sizes])
    ax.minorticks_off()
    ax.set_xlim(sizes[0] * 0.7, sizes[-1] * 2.6)
    ax.set_xlabel("Número de sensores (escala logarítmica)", color=INK, fontsize=9)
    ax.set_ylabel("Tempo de processamento por atualização (ms)\nescala logarítmica", color=INK, fontsize=9)
    style_axes(ax)
    ax.legend(frameon=False, fontsize=9, labelcolor=INK, loc="upper left")
    fig.tight_layout()
    fig.savefig(path.with_suffix(".png"))
    fig.savefig(path.with_suffix(".pdf"))
    plt.close(fig)


def fmt(value, digits=4):
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return "n/d"
    return f"{value:.{digits}g}".replace(".", ",")


def find_pair(pairs, context, a, b):
    for pair in pairs:
        if all(pair.get(key) == value for key, value in context.items()) and {pair["a"], pair["b"]} == {a, b}:
            sign = 1 if pair["a"] == a else -1
            return {**pair, "diferenca": sign * pair["diferenca"]}
    return None


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    results = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if results is None or not results.exists():
        sys.exit("Informe a pasta de resultados.")
    out = results / "analise"
    figures = out / "figuras"
    figures.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(SEED)

    descriptive, tests, pairs = [], [], []

    def analyse(frame, measures, context, prefix):
        for measure, (label, test_groups, per_update) in measures.items():
            groups = {
                name: frame.loc[frame["implementacao"] == name, measure].dropna().to_numpy(dtype=float)
                for name in ALL
            }
            groups = {name: values for name, values in groups.items() if len(values) > 0}
            if not groups:
                continue
            for name, values in groups.items():
                descriptive.append({**context, "medida": measure, "implementacao": name, **describe(values)})

            plotted = groups if test_groups is None else {n: groups[n] for n in test_groups if n in groups}
            distribution_figure(plotted, label, figures / f"{prefix}_{measure}", rng)

            if test_groups is None:
                continue
            tested = {name: groups[name] for name in test_groups if name in groups}
            if len(tested) < 2:
                continue
            test, measure_pairs = compare(tested, per_update, rng)
            tests.append({**context, "medida": measure, **test})
            pairs.extend({**context, "medida": measure, **pair} for pair in measure_pairs)

    runtime_file = results / "execucoes.csv"
    if runtime_file.exists():
        runtime = pd.read_csv(runtime_file)
        runtime = runtime[(runtime["valido"] == 1) & (runtime["bloco"] > DISCARDED_BLOCKS)]
        for (part, scenario, sensors), frame in runtime.groupby(["parte", "cenario", "sensores"]):
            context = {"fonte": "execucao", "parte": part, "cenario": scenario, "sensores": int(sensors)}
            analyse(frame, RUNTIME_MEASURES, context, f"{part}_{scenario}_{int(sensors)}")

    lighthouse_file = results / "lighthouse.csv"
    if lighthouse_file.exists():
        lighthouse = pd.read_csv(lighthouse_file)
        lighthouse = lighthouse[(lighthouse["valido"] == 1) & (lighthouse["bloco"] > DISCARDED_BLOCKS)]
        if not lighthouse.empty:
            context = {"fonte": "lighthouse", "parte": "B", "cenario": "carregamento", "sensores": 1000}
            analyse(lighthouse, LIGHTHOUSE_MEASURES, context, "B_carregamento")

    descriptive_table = pd.DataFrame(descriptive)
    tests_table = pd.DataFrame(tests)
    pairs_table = pd.DataFrame(pairs)
    descriptive_table.to_csv(out / "descritiva.csv", index=False)
    tests_table.to_csv(out / "testes.csv", index=False)
    pairs_table.to_csv(out / "pares.csv", index=False)

    # --- Curva de escala ---
    scale_lines = []
    if not descriptive_table.empty:
        # Só a parte C: a curva usa dados de uma mesma sessão, e o ponto de 1.000
        # sensores da parte A fica de fora (decisão de 21/11/2026, plano, seção 1.1).
        scale = descriptive_table[
            (descriptive_table["parte"] == "C")
            & (descriptive_table["medida"] == "tick_medio_ms")
            & (descriptive_table["cenario"] == "localized")
        ]
        if scale["sensores"].nunique() > 1:
            scale_figure(scale, figures / "escala_tick_medio_ms")
            pivot = scale.pivot_table(index="implementacao", columns="sensores", values="media")
            pivot["razao_maior_sobre_menor"] = pivot.iloc[:, -1] / pivot.iloc[:, 0]
            pivot.to_csv(out / "escala.csv")
            sizes = [column for column in pivot.columns if column != "razao_maior_sobre_menor"]
            scale_lines.append("| Implementação | " + " | ".join(f"{size} sensores" for size in sizes) + " | Maior ÷ menor |")
            scale_lines.append("|---|" + "---|" * (len(sizes) + 1))
            for name in ALL:
                if name in pivot.index:
                    row = pivot.loc[name]
                    scale_lines.append(
                        f"| {IMPLEMENTATIONS[name][0]} | "
                        + " | ".join(fmt(row[size]) for size in sizes)
                        + f" | {fmt(row['razao_maior_sobre_menor'], 3)} |"
                    )

    # --- Resumo por hipótese ---
    lines = ["# Números para a decisão das hipóteses", "",
             "As regras estão em Docs/plano-medicao.md, seção 11. Os vereditos abaixo aplicam essas regras",
             "aos dados; confira-os antes de levar ao texto.", ""]

    # No ensaio e no teste rápido, esses dois arquivos ficam na pasta acima.
    def beside(name):
        return results / name if (results / name).exists() else results.parent / name

    code_file, bundle_file = beside("codigo.csv"), beside("pacote.csv")
    lines += ["## H1: rastreabilidade do Redux ao custo de mais código", ""]
    if code_file.exists():
        code = pd.read_csv(code_file).set_index("implementacao")
        lines += ["| Implementação | Linhas de código | Funções da biblioteca | Arquivos de estado | Componentes acoplados |",
                  "|---|---|---|---|---|"]
        for name in ALL:
            if name in code.index:
                row = code.loc[name]
                lines.append(f"| {IMPLEMENTATIONS[name][0]} | {row['linhas_de_codigo']} | {row['funcoes_da_biblioteca']} | "
                             f"{row['arquivos_de_estado']} | {row['componentes_acoplados']} |")
        if all(name in code.index for name in LIBRARIES):
            more_lines = all(code.loc["redux", "linhas_de_codigo"] > code.loc[n, "linhas_de_codigo"] for n in ["zustand", "jotai"])
            more_functions = all(code.loc["redux", "funcoes_da_biblioteca"] > code.loc[n, "funcoes_da_biblioteca"] for n in ["zustand", "jotai"])
            lines += ["", f"- Redux tem mais linhas de código que Zustand e Jotai: {'sim' if more_lines else 'não'}.",
                      f"- Redux usa mais funções da biblioteca que Zustand e Jotai: {'sim' if more_functions else 'não'}.",
                      "- Os três critérios de rastreabilidade são avaliados à mão (seção 11 do plano)."]
    lines.append("")

    lines += ["## H2: Zustand com menor pacote e menor carregamento", ""]
    smallest = None
    if bundle_file.exists():
        bundle = pd.read_csv(bundle_file).set_index("implementacao")
        lines += ["| Implementação | JavaScript (bytes) | JavaScript gzip (bytes) | Diferença para o baseline (bytes) |", "|---|---|---|---|"]
        for name in ALL:
            if name in bundle.index:
                base = bundle.loc["context", "js_bytes"] if "context" in bundle.index else np.nan
                lines.append(f"| {IMPLEMENTATIONS[name][0]} | {bundle.loc[name, 'js_bytes']} | {bundle.loc[name, 'js_gzip_bytes']} | "
                             f"{bundle.loc[name, 'js_bytes'] - base:+.0f} |")
        if all(name in bundle.index for name in LIBRARIES):
            smallest = bundle.loc[LIBRARIES, "js_bytes"].idxmin() == "zustand"
            lines += ["", f"- Zustand tem o menor pacote entre as três bibliotecas: {'sim' if smallest else 'não'}."]
    lcp_context = {"fonte": "lighthouse", "medida": "lcp_ms"}
    lcp_pairs = [find_pair(pairs, lcp_context, "zustand", other) for other in ["redux", "jotai"]]
    if all(lcp_pairs):
        for other, pair in zip(["Redux", "Jotai"], lcp_pairs):
            lines.append(f"- LCP, Zustand menos {other}: {fmt(pair['diferenca'])} ms, p ajustado {fmt(pair['p_ajustado'], 3)}, "
                         f"{'significativo' if pair['significativo'] else 'não significativo'}.")
        lower = all(pair["significativo"] and pair["diferenca"] < 0 for pair in lcp_pairs)
        if smallest is not None:
            verdict = "refutada" if not smallest else ("confirmada" if lower else "relativizada")
            lines += ["", f"**Veredito pela regra: H2 {verdict}.**"]
    lines.append("")

    lines += ["## H3: Jotai com menor custo de propagação no cenário localizado", ""]
    tick_context = {"fonte": "execucao", "parte": "A", "cenario": "localized", "medida": "tick_medio_ms"}
    tick_rows = [row for row in descriptive if all(row.get(k) == v for k, v in tick_context.items())]
    if tick_rows:
        lines += ["| Implementação | Média (ms) | Desvio-padrão (ms) | Mediana (ms) | n |", "|---|---|---|---|---|"]
        for row in tick_rows:
            note = " (não comparável, ver plano 2.1)" if row["implementacao"] == "context" else ""
            lines.append(f"| {IMPLEMENTATIONS[row['implementacao']][0]}{note} | {fmt(row['media'])} | "
                         f"{fmt(row['desvio_padrao'])} | {fmt(row['mediana'])} | {row['n']} |")
        lines.append("")
    tick_pairs = [find_pair(pairs, tick_context, "jotai", other) for other in ["redux", "zustand"]]
    if all(tick_pairs):
        for other, pair in zip(["Redux", "Zustand"], tick_pairs):
            lines.append(f"- Jotai menos {other}: {fmt(pair['diferenca'])} ms ({fmt(100 * pair['diferenca'] / FRAME_MS, 3)}% de um frame), "
                         f"p ajustado {fmt(pair['p_ajustado'], 3)}, {'significativo' if pair['significativo'] else 'não significativo'}.")
        if any(pair["diferenca"] >= 0 for pair in tick_pairs):
            verdict = "refutada"
        elif all(pair["significativo"] for pair in tick_pairs):
            verdict = "confirmada, desde que o teste de renderizações mostre 1 componente por atualização"
        else:
            verdict = "relativizada"
        lines += ["", f"**Veredito pela regra: H3 {verdict}.**"]
    lines.append("")

    if scale_lines:
        lines += ["## Curva de escala: tempo médio de processamento (ms), cenário localizado", "", *scale_lines, ""]

    (out / "hipoteses.md").write_text("\n".join(lines), encoding="utf-8")
    (out / "ambiente-analise.json").write_text(json.dumps({
        "python": sys.version.split()[0],
        "scipy": scipy.__version__,
        "scikit-posthocs": sp.__version__,
        "pandas": pd.__version__,
        "numpy": np.__version__,
        "matplotlib": matplotlib.__version__,
    }, indent=2), encoding="utf-8")

    print(f"Análise gravada em: {out}")
    print(f"  {len(descriptive)} linhas de estatística descritiva, {len(tests)} testes, {len(pairs)} pares")
    print(f"  figuras em: {figures}")


if __name__ == "__main__":
    main()
