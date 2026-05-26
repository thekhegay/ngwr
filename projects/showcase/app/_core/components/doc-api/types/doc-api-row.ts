/**
 * Single row in a documentation API table.
 *
 * Describes a public input/output/property of a component.
 *
 * @example
 * ```ts
 * const rows: DocApiRow[] = [
 *   { name: 'color', type: 'WrColor', default: "'primary'", description: 'Color variant.' },
 *   { name: 'size',  type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Size variant.' },
 *   { name: 'name',  type: 'WrIconName', required: true, description: 'Icon name.' },
 * ];
 * ```
 */
export interface DocApiRow {
  /** Property name as written in templates (e.g. `color`, `[size]`, `(closed)`). */
  name: string;
  /** Short description shown in the table. */
  description: string;
  /** TypeScript type signature, rendered as code. */
  type: string;
  /** Default value, rendered as code. Omit for required inputs. */
  default?: string;
  /** Marks the property as required. */
  required?: boolean;
}
