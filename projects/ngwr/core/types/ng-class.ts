export type NgClassType = string | string[] | Set<string> | NgClassInterface;

// use klass vs class
export interface NgClassInterface {
  [klass: string]: any;
}

// use klass vs class
export interface NgStyleInterface {
  [klass: string]: any;
}
