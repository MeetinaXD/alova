import { MethodConfig, RequestState } from '../../typings';
import Method from './Method';

export default class Head<S extends RequestState, E extends RequestState, R> extends Method<S, E, R> {
  constructor(url: string, config: MethodConfig<R>) {
    super('HEAD', url, config);
  }
}