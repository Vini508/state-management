import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createInitialSensors,
  INITIAL_SEED,
  SENSOR_IDS,
  updateAllSensors,
  updateOneSensor,
  type Sensor,
} from "./domain/sensors";
import {
  SensorProvider,
  useIsRunning,
  useSensor,
  useSensorActions,
  useSimulationMode,
} from "./state";

// Este arquivo é compartilhado entre todos os branches e não pode ser alterado
// neles: ele prova que cada implementação de src/state cumpre o mesmo contrato.

function useContract() {
  return {
    mode: useSimulationMode(),
    isRunning: useIsRunning(),
    actions: useSensorActions(),
    // SENSOR_IDS é constante, então a ordem das chamadas de hook é estável.
    sensors: SENSOR_IDS.map((id) => useSensor(id)),
  };
}

function renderContract() {
  const view = renderHook(useContract, { wrapper: SensorProvider });
  // Redux e Zustand guardam o estado num store global, que sobrevive entre testes.
  act(() => view.result.current.actions.reset());
  return view;
}

function expectedAfterTicks(
  ticks: number,
  update: (sensors: Sensor[], seed: number, tick: number) => { sensors: Sensor[]; seed: number },
): Sensor[] {
  let sensors = createInitialSensors();
  let seed = INITIAL_SEED;

  for (let tick = 0; tick < ticks; tick += 1) {
    ({ sensors, seed } = update(sensors, seed, tick));
  }

  return sensors;
}

describe("contrato de estado", () => {
  it("inicia pausado, no modo simultaneo e com os valores iniciais", () => {
    const { result } = renderContract();

    expect(result.current.isRunning).toBe(false);
    expect(result.current.mode).toBe("simultaneous");
    expect(result.current.sensors).toEqual(createInitialSensors());
  });

  it("ignora ticks enquanto pausado", () => {
    const { result } = renderContract();

    act(() => result.current.actions.tick());

    expect(result.current.sensors).toEqual(createInitialSensors());
  });

  it("mantem o objeto de acoes estavel entre renderizacoes", () => {
    const { result } = renderContract();
    const { actions } = result.current;

    act(() => {
      actions.start();
      actions.tick();
    });

    expect(result.current.actions).toBe(actions);
  });

  it("atualiza todos os sensores por tick, pausa e reinicia", () => {
    const { result } = renderContract();

    act(() => result.current.actions.start());
    expect(result.current.isRunning).toBe(true);

    for (let tick = 0; tick < 3; tick += 1) {
      act(() => result.current.actions.tick());
    }
    expect(result.current.sensors).toEqual(
      expectedAfterTicks(3, (sensors, seed) => updateAllSensors(sensors, seed)),
    );

    act(() => result.current.actions.pause());
    const pausedSensors = result.current.sensors;
    act(() => result.current.actions.tick());
    expect(result.current.isRunning).toBe(false);
    expect(result.current.sensors).toEqual(pausedSensors);

    act(() => result.current.actions.reset());
    expect(result.current.sensors).toEqual(createInitialSensors());
  });

  it("no modo localizado atualiza um sensor por tick em ordem circular", () => {
    const { result } = renderContract();

    act(() => result.current.actions.setMode("localized"));
    expect(result.current.mode).toBe("localized");
    expect(result.current.isRunning).toBe(false);

    act(() => result.current.actions.start());

    const count = SENSOR_IDS.length;
    const tickAndListChanged = () => {
      const previous = result.current.sensors;
      act(() => result.current.actions.tick());

      return result.current.sensors.flatMap((sensor, index) =>
        sensor === previous[index] ? [] : [index],
      );
    };

    expect(tickAndListChanged()).toEqual([0]);
    expect(tickAndListChanged()).toEqual([1]);
    // Os ticks do meio rodam num único act para o teste não renderizar mil vezes;
    // a comparação final com a sequência esperada confere todos eles.
    act(() => {
      for (let tick = 2; tick < count - 1; tick += 1) {
        result.current.actions.tick();
      }
    });
    expect(tickAndListChanged()).toEqual([count - 1]);
    expect(tickAndListChanged()).toEqual([0]);

    expect(result.current.sensors).toEqual(
      expectedAfterTicks(count + 1, (sensors, seed, tick) =>
        updateOneSensor(sensors, tick % count, seed),
      ),
    );
  });
});
