export const cart = { mass: 1, drag: 0.65, load: 0.5, forceLimit: 7, duration: 12, band: 0.02 };
export const controls = [
  { key: 'kp', symbol: 'Kp', max: 24, initial: 6 },
  { key: 'ki', symbol: 'Ki', max: 8, initial: 0 },
  { key: 'kd', symbol: 'Kd', max: 12, initial: 0.5 },
] as const;

export type Gains = Record<typeof controls[number]['key'], number>;
export const initialGains: Gains = { kp: controls[0].initial, ki: controls[1].initial, kd: controls[2].initial };

export function readGains(params: URLSearchParams): Gains {
  const gains = { ...initialGains };
  for (const { key, max } of controls) {
    const raw = params.get(key)?.trim();
    if (!raw || !Number.isFinite(Number(raw))) continue;
    gains[key] = Math.round(Math.min(max, Math.max(0, Number(raw))) * 10) / 10;
  }
  return gains;
}

export const payloadOptions = [0.25, 0.5, 1];
export type Scenario = { mona: boolean; payload: number; compare: boolean };

export function readScenario(params: URLSearchParams): Scenario {
  const payload = Number(params.get('payload'));
  return {
    mona: params.get('scenario') === 'mona',
    payload: payloadOptions.includes(payload) ? payload : 0.5,
    compare: params.get('compare') !== '0'
  };
}

export function writeScenario(params: URLSearchParams, scenario: Scenario) {
  if (scenario.mona) {
    params.set('scenario', 'mona');
    params.set('payload', String(scenario.payload));
    params.set('compare', scenario.compare ? '1' : '0');
  } else {
    for (const key of ['scenario', 'payload', 'compare']) params.delete(key);
  }
}

export function runCart({ kp, ki, kd }: Gains, payload = 0) {
  const mass = cart.mass + payload;
  const dt = 0.005;
  let x = 0, velocity = 0, integral = 0;
  let peak = 0, lastOutside = 0;
  const positions = [x];

  for (let step = 1; step <= cart.duration / dt; step++) {
    const error = 1 - x;
    const trialIntegral = integral + ki * error * dt;
    const trialForce = kp * error + trialIntegral - kd * velocity;
    // Integrate only while unsaturated or when the error relieves saturation.
    if (Math.abs(trialForce) <= cart.forceLimit || trialForce * error < 0) integral = trialIntegral;
    const force = Math.max(-cart.forceLimit, Math.min(cart.forceLimit, kp * error + integral - kd * velocity));
    velocity += ((force - cart.drag * velocity - cart.load) / mass) * dt;
    x += velocity * dt;
    peak = Math.max(peak, x);
    if (Math.abs(1 - x) > cart.band) lastOutside = step;
    if (step % 5 === 0) positions.push(x);
  }
  // A late crossing needs half a second in band to count as settled on the displayed trace.
  const timeInBand = (lastOutside + 1) * dt;
  const settling = cart.duration - timeInBand >= 0.5 ? timeInBand : null;
  const overshoot = Math.max(0, (peak - 1) * 100);
  return { positions, settling, overshoot, passed: settling !== null && settling <= 3 && overshoot <= 5 };
}

export function plotGeometry(positions: number[], comparison: number[] = []) {
  const lo = Math.min(0, ...positions, ...comparison);
  const hi = Math.max(1.1, ...positions, ...comparison);
  const unit = Math.max(0.5, Math.ceil((hi - lo) / 4 * 2) / 2);
  const min = Math.floor(lo / unit) * unit;
  const max = Math.ceil(hi / unit) * unit;
  const ordinate = (position: number) => 100 - (position - min) / (max - min) * 100;
  const pathFor = (trace: number[]) => trace.map((position, i) =>
    (i ? 'L' : 'M') + (i * 100 / (trace.length - 1)).toFixed(3) + ' ' + ordinate(position).toFixed(3)
  ).join(' ');
  const ticks = Array.from({ length: Math.round((max - min) / unit) + 1 }, (_, i) => {
    const value = max - i * unit;
    return { value, y: ordinate(value) };
  });
  return { path: pathFor(positions), comparisonPath: pathFor(comparison), ticks, targetY: ordinate(1), bandY: ordinate(1 + cart.band), bandHeight: ordinate(1 - cart.band) - ordinate(1 + cart.band) };
}
