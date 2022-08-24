import {
  useRequest,
  updateState,
  cacheMode,
} from '../../../src';
import ReactHook from '../../../src/predefine/ReactHook';
import { Result } from '../result.type';
import { mockServer, getAlovaInstance, untilCbCalled } from '../../utils';
import { render, screen } from '@testing-library/react';
import React, { ReactElement } from 'react';
import '@testing-library/jest-dom';
import { getResponseCache } from '../../../src/storage/responseCache';
import { key } from '../../../src/utils/helper';
import { getPersistentResponse } from '../../../src/storage/responseStorage';


beforeAll(() => mockServer.listen());
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());

describe('update cached response data by user in react', function() {
  test('the cached response data should be changed and the screen should be update', async () => {
    const alova = getAlovaInstance(ReactHook);
    const Get = alova.Get('/unit-test', {
      localCache: {
        expire: 100000,
        mode: cacheMode.STORAGE_PLACEHOLDER,
      },
      transformData: ({ data }: Result) => data,
    });

    function Page() {
      const {
        data = { path: '' },
        onSuccess,
      } = useRequest(Get);
      onSuccess(() => updateState(Get, data => {
        return {
          ...data,
          path: '/unit-test-updated',
        };
      }));
      return <div role="path">{data.path}</div>;
    }
    render(<Page /> as ReactElement<any, any>);
    await screen.findByText(/unit-test/);

    // 延迟检查页面是否有更新
    await untilCbCalled(setTimeout, 100);
    expect(screen.getByRole('path')).toHaveTextContent('/unit-test-updated');
    const cacheData = getResponseCache(alova.id, key(Get)); 
    expect(cacheData.path).toBe('/unit-test-updated');   // 除了状态数据被更新外，缓存也将会被更新
    const storageData = getPersistentResponse(alova.id, key(Get), alova.storage);
    expect(storageData.path).toBe('/unit-test-updated');   // 持久化数据也将被更新
  });
});