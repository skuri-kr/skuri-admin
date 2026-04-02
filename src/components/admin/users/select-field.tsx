"use client";

import { FormField } from "@/components/admin/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectFieldProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  getLabel?: (option: string) => string;
  widthClassName?: string;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  getLabel,
  widthClassName,
}: SelectFieldProps) {
  return (
    <FormField label={label} className={widthClassName}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {getLabel ? getLabel(option) : option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
