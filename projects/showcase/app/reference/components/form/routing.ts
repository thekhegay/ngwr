import type { Routes } from '@angular/router';

import { ROUTES } from '#routes';

const components = ROUTES.reference.components;

/** Folder only — every page stays at `/reference/components/<slug>`. */
export const FORM_ROUTES = [
  { path: components.calendar.path, loadComponent: () => import('./calendar/calendar') },
  { path: components.cascader.path, loadComponent: () => import('./cascader/cascader') },
  { path: components.checkbox.path, loadComponent: () => import('./checkbox/checkbox') },
  { path: components.colorPicker.path, loadComponent: () => import('./color-picker/color-picker') },
  { path: components.datePicker.path, loadComponent: () => import('./date-picker/date-picker') },
  { path: components.fileUpload.path, loadComponent: () => import('./file-upload/file-upload') },
  { path: components.form.path, loadComponent: () => import('./form/form') },
  { path: components.formField.path, loadComponent: () => import('./form-field/form-field') },
  { path: components.input.path, loadComponent: () => import('./input/input') },
  { path: components.inputNumber.path, loadComponent: () => import('./input-number/input-number') },
  { path: components.inputOtp.path, loadComponent: () => import('./input-otp/input-otp') },
  { path: components.knob.path, loadComponent: () => import('./knob/knob') },
  { path: components.mention.path, loadComponent: () => import('./mention/mention') },
  { path: components.radio.path, loadComponent: () => import('./radio/radio') },
  { path: components.rating.path, loadComponent: () => import('./rating/rating') },
  { path: components.schemaForm.path, loadComponent: () => import('./schema-form/schema-form') },
  { path: components.segmented.path, loadComponent: () => import('./segmented/segmented') },
  { path: components.select.path, loadComponent: () => import('./select/select') },
  { path: components.slider.path, loadComponent: () => import('./slider/slider') },
  { path: components.switch.path, loadComponent: () => import('./switch/switch') },
  { path: components.textarea.path, loadComponent: () => import('./textarea/textarea') },
  { path: components.transfer.path, loadComponent: () => import('./transfer/transfer') },
  { path: components.editor.path, loadComponent: () => import('./editor/editor') },
] satisfies Routes;
