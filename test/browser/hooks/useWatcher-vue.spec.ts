import {
  useWatcher,
} from '../../../src';
import VueHook from '../../../src/predefine/VueHook';
import { getResponseCache } from '../../../src/storage/responseCache';
import { key } from '../../../src/utils/helper';
import { Result } from '../result.type';
import { mockServer, getAlovaInstance } from '../../utils';
import { ref } from 'vue';
import Method from '../../../src/Method';

beforeAll(() => mockServer.listen());
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());

describe('use useWatcher hook to send GET with vue', function() {
  test('should specify at least one watching state', () => {
    const alova = getAlovaInstance(VueHook);
    expect(() => useWatcher(() => alova.Get<Result>('/unit-test'), [])).toThrowError();
  });
  test('should send request when change value', done => {
    const alova = getAlovaInstance(VueHook);
    const mutateNum = ref(0);
    const mutateStr = ref('a');
    let currentGet: Method<any, any, any, any, any, any, any>;
    const {
      loading,
      data,
      downloading,
      error,
      onSuccess,
    } = useWatcher(() => {
      const get = currentGet = alova.Get('/unit-test', {
        params: { num: mutateNum.value, str: mutateStr.value },
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        transformData: (result: Result) => result.data,
        localCache: 100 * 1000,
      });
      return get;
    }, [mutateNum, mutateStr]);
    const initialData = () => {
      expect(loading.value).toBeFalsy();
      expect(data.value).toBeUndefined();
      expect(downloading.value).toEqual({ total: 0, loaded: 0 });
      expect(error.value).toBeUndefined();
    };
    // 一开始和两秒后数据都没有改变，表示监听状态未改变时不会触发请求
    initialData();
    setTimeout(() => {
      initialData();
      // 当监听状态改变时触发请求，且两个状态都变化只会触发一次请求
      mutateNum.value = 1;
      mutateStr.value = 'b';
    }, 1000);
    const mockCallback = jest.fn(() => {});
    onSuccess(mockCallback);

    const successTimesFns = [() => {
      expect(loading.value).toBeFalsy();
      expect(data.value.path).toBe('/unit-test');
      expect(data.value.params.num).toBe('1');
      expect(data.value.params.str).toBe('b');
      expect(downloading.value).toEqual({ total: 0, loaded: 0 });
      expect(error.value).toBeUndefined();
      // 缓存有值
      const cacheData = getResponseCache(alova.id, key(currentGet));
      expect(cacheData.path).toBe('/unit-test');
      expect(cacheData.params).toEqual({ num: '1', str: 'b' });
      expect(mockCallback.mock.calls.length).toBe(1);
      mutateNum.value = 2;
      mutateStr.value = 'c';
    }, () => {
      expect(data.value.params.num).toBe('2');
      expect(data.value.params.str).toBe('c');
      const cacheData = getResponseCache(alova.id, key(currentGet));
      expect(cacheData.params).toEqual({ num: '2', str: 'c' });
      expect(mockCallback.mock.calls.length).toBe(2);
      done();
    }];

    // 根据触发次数来运行不同回调函数
    let watchTimes = 0;
    onSuccess(() => {
      successTimesFns[watchTimes]();
      watchTimes++;
    });
  });

  test('should send request one time when value change\'s time less then debounce', done => {
    const alova = getAlovaInstance(VueHook);
    const mutateNum = ref(0);
    const mutateStr = ref('a');
    let currentGet: Method<any, any, any, any, any, any, any>;
    const {
      loading,
      data,
      downloading,
      error,
      onSuccess
    } = useWatcher(() => {
      const get = currentGet = alova.Get('/unit-test', {
        params: { num: mutateNum.value, str: mutateStr.value },
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        transformData: (result: Result) => result.data,
        localCache: 100 * 1000,
      });
      return get;
    }, [mutateNum, mutateStr], { debounce: 2000 });

    // 在两秒内重新改变状态值，只会触发一次请求
    setTimeout(() => {
      mutateNum.value = 1;
      mutateStr.value = 'b';
      expect(loading.value).toBeFalsy();
      expect(data.value).toBeUndefined();
      expect(downloading.value).toEqual({ total: 0, loaded: 0 });
      expect(error.value).toBeUndefined();
      setTimeout(() => {
        mutateNum.value = 2;
        mutateStr.value = 'c';
        expect(loading.value).toBeFalsy();
        expect(data.value).toBeUndefined();
        expect(downloading.value).toEqual({ total: 0, loaded: 0 });
        expect(error.value).toBeUndefined();
      }, 500);
    }, 500);
    const mockCallback = jest.fn(() => {});
    onSuccess(mockCallback);
    onSuccess(() => {
      expect(loading.value).toBeFalsy();
      expect(data.value.path).toBe('/unit-test');
      expect(data.value.params.num).toBe('2');
      expect(data.value.params.str).toBe('c');
      expect(downloading.value).toEqual({ total: 0, loaded: 0 });
      expect(error.value).toBeUndefined();
      // 缓存有值
      const cacheData = getResponseCache(alova.id, key(currentGet));
      expect(cacheData.path).toBe('/unit-test');
      expect(cacheData.params).toEqual({ num: '2', str: 'c' });
      expect(mockCallback.mock.calls.length).toBe(1);
      done();
    });
  });

  test('should send request when set the param `immediate`', done => {
    const alova = getAlovaInstance(VueHook);
    const mutateNum = ref(0);
    const mutateStr = ref('a');
    let currentGet: Method<any, any, any, any, any, any, any>;
    const {
      loading,
      data,
      downloading,
      error,
      onSuccess
    } = useWatcher(() => {
      const get = currentGet = alova.Get('/unit-test', {
        params: { num: mutateNum.value, str: mutateStr.value },
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        transformData: (result: Result) => result.data,
        localCache: 0,
      });
      return get;
    }, [mutateNum, mutateStr], { immediate: true });
    expect(loading.value).toBeTruthy();
    expect(data.value).toBeUndefined();
    expect(downloading.value).toEqual({ total: 0, loaded: 0 });
    expect(error.value).toBeUndefined();
    const mockCallback = jest.fn(() => {});
    onSuccess(mockCallback);
    const successTimesFns = [() => {
      expect(loading.value).toBeFalsy();
      expect(data.value.path).toBe('/unit-test');
      expect(data.value.params.num).toBe('0');
      expect(data.value.params.str).toBe('a');
      expect(downloading.value).toEqual({ total: 0, loaded: 0 });
      expect(error.value).toBeUndefined();
      // 缓存有值
      const cacheData = getResponseCache(alova.id, key(currentGet));
      expect(cacheData).toBeUndefined();
      expect(mockCallback.mock.calls.length).toBe(1);
      mutateNum.value = 2;
      mutateStr.value = 'c';
    }, () => {
      expect(data.value.params.num).toBe('2');
      expect(data.value.params.str).toBe('c');
      const cacheData = getResponseCache(alova.id, key(currentGet));
      expect(cacheData).toBeUndefined();
      expect(mockCallback.mock.calls.length).toBe(2);
      done();
    }];

    // 根据触发次数来运行不同回调函数
    let watchTimes = 0;
    onSuccess(() => {
      successTimesFns[watchTimes]();
      watchTimes++;
    });
  });

  test('initial request shouldn\'t delay when set the `immediate` and `debounce`', done => {
    const alova = getAlovaInstance(VueHook);
    const mutateNum = ref(0);
    const mutateStr = ref('a');
    let currentGet: Method<any, any, any, any, any, any, any>;
    const {
      loading,
      data,
      downloading,
      error,
      onSuccess,
    } = useWatcher(() => {
      const get = currentGet = alova.Get('/unit-test', {
        params: { num: mutateNum.value, str: mutateStr.value },
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        transformData: (result: Result) => result.data,
        localCache: 0,
      });
      return get;
    }, [mutateNum, mutateStr], { immediate: true, debounce: 1000 });

    // 监听时立即出发一次请求，因此loading的值为true
    expect(loading.value).toBeTruthy();
    expect(data.value).toBeUndefined();
    expect(downloading.value).toEqual({ total: 0, loaded: 0 });
    expect(error.value).toBeUndefined();
    const mockCallback = jest.fn(() => {});
    onSuccess(mockCallback);
    const successTimesFns = [() => {
      expect(loading.value).toBeFalsy();
      expect(data.value.path).toBe('/unit-test');
      expect(data.value.params.num).toBe('0');
      expect(data.value.params.str).toBe('a');
      expect(downloading.value).toEqual({ total: 0, loaded: 0 });
      expect(error.value).toBeUndefined();
      // 缓存有值
      const cacheData = getResponseCache(alova.id, key(currentGet));
      expect(cacheData).toBeUndefined();
      expect(mockCallback.mock.calls.length).toBe(1);
      mutateNum.value = 2;
      mutateStr.value = 'c';

      // 因为值改变后延迟1000毫秒发出请求，因此500毫秒后应该还是原数据
      setTimeout(() => {
        expect(data.value.params.num).toBe('0');
        expect(data.value.params.str).toBe('a');
      }, 500);
    }, () => {
      expect(data.value.params.num).toBe('2');
      expect(data.value.params.str).toBe('c');
      const cacheData = getResponseCache(alova.id, key(currentGet));
      expect(cacheData).toBeUndefined();
      expect(mockCallback.mock.calls.length).toBe(2);
      done();
    }];

    // 根据触发次数来运行不同回调函数
    let watchTimes = 0;
    onSuccess(() => {
      successTimesFns[watchTimes]();
      watchTimes++;
    });
  });
});