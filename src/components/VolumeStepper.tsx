import { Stepper } from './Stepper';

/** A 10–100% volume in tenths, set apart from the device's media volume. */
export function VolumeStepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const tenths = Math.round(value * 10);
  return (
    <Stepper
      label={label}
      display={`${tenths * 10}%`}
      spoken={`${tenths * 10} percent`}
      hint="Separate from your media volume"
      canDecrement={tenths > 1}
      canIncrement={tenths < 10}
      onDecrement={() => onChange((tenths - 1) / 10)}
      onIncrement={() => onChange((tenths + 1) / 10)}
    />
  );
}
