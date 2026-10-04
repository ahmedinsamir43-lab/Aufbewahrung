import { ringState } from '../ring';

describe('ringState', () => {
  it('berechnet Füllung, Prozent und Rest', () => {
    expect(ringState(64, 128)).toEqual({ fill: 0.5, percent: 50, over: false, remaining: 64 });
  });

  it('begrenzt die Füllung bei Überschreitung und markiert sie', () => {
    expect(ringState(150, 100)).toEqual({ fill: 1, percent: 150, over: true, remaining: 0 });
  });

  it('wertet exaktes Erreichen nicht als Überschreitung', () => {
    expect(ringState(100, 100).over).toBe(false);
    expect(ringState(100.4, 100).over).toBe(false);
  });

  it('behandelt negative Werte und Soll 0', () => {
    expect(ringState(-5, 100).fill).toBe(0);
    expect(ringState(0, 0)).toEqual({ fill: 0, percent: 0, over: false, remaining: 0 });
    expect(ringState(10, 0).over).toBe(true);
  });
});
