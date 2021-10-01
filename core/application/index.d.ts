/* eslint-disabled */
import { EventEmitter } from 'events';

export interface ConfigInterface extends Record<string, any> {
  [name: string]: any;
}

export interface LoggerInterface {
  debug(message?: any, ...optionalParams: any[]): void;

  log(message?: any, ...optionalParams: any[]): void;

  info(message?: any, ...optionalParams: any[]): void;

  warn(message?: any, ...optionalParams: any[]): void;

  error(message?: any, ...optionalParams: any[]): void;
}

export interface SessionInterface<U = any> {
  authorized: boolean;

  authorize(value: U): void;

  destroy(): void;

  get<T = unknown>(key: string, defaultValue?: T): T | undefined;

  set<T = unknown>(key: string, value: T): this;

  valueOf(): U | undefined;
}

export interface ServiceInterface {
  ID: string;

  shutdown?: () => Promise<void>;
}

export interface BaseApplicationInterface {
  config: ConfigInterface;
  logger: LoggerInterface;
}

export interface BaseContextInterface<S = {}> extends BaseApplicationInterface {
  session: SessionInterface<S>;
}

export type ContextInterface<S = any> = Record<string, ServiceInterface> & BaseContextInterface<S>;

export interface ApiFunction<T = any, R = any> extends CallableFunction {
  (context: ContextInterface, params: T): Promise<R>;

  (context: ContextInterface, params: T, ...args: any[]): Promise<R>;
}

export interface AccessFunction extends CallableFunction {
  (context: ContextInterface, ...args: any[]): Promise<boolean>;
}

export interface ValidateFunction extends CallableFunction {
  <T = any>(params: T, context?: ContextInterface): Promise<T>;
}

export interface ApiMethodInterface {
  name: string;
  call: ApiFunction;
  access: boolean | AccessFunction;
  validate?: ValidateFunction;
}

export interface ApplicationAccessFunction {
  (context: ContextInterface, access: ApiMethodInterface['access']): Promise<boolean>;
}

export interface ApplicationValidateFunction {
  <T = any>(context: ContextInterface, validate: ApiMethodInterface['validate'], params: T): Promise<T>;
}

export interface ApplicationInterface extends BaseApplicationInterface, EventEmitter {
  services: Readonly<Record<string, ServiceInterface>>;
  servers: Readonly<ServiceInterface[]>;

  getStaticFile(name: string): any | undefined;

  getApiMethod(name: string): ApiMethodInterface | undefined;

  callApi(method: string, params: any, session: SessionInterface): Promise<any>;

  callRpcApi(request: string, session: SessionInterface): Promise<string>;
}

export interface ApplicationServiceFactory {
  (app: ApplicationInterface): Promise<ServiceInterface>;
}

export interface ConsoleLogger extends LoggerInterface {
  new (config: Object, id: string | number): LoggerInterface;
}
