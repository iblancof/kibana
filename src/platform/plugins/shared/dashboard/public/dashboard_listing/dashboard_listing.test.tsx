/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { PropsWithChildren } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
/**
 * Mock Table List view. This dashboard component is a wrapper around the shared UX table List view. We
 * need to ensure we're passing down the correct props, but the table list view itself doesn't need to be rendered
 * in our tests because it is covered in its package.
 */
import { TableListView } from '@kbn/content-management-table-list-view';

import { DashboardListing } from './dashboard_listing';
import { DashboardListingProps } from './types';
import { coreServices } from '../services/kibana_services';
import { render } from '@testing-library/react';

jest.mock('@kbn/content-management-table-list-view-table', () => {
  const originalModule = jest.requireActual('@kbn/content-management-table-list-view-table');
  return {
    __esModule: true,
    ...originalModule,
    TableListViewKibanaProvider: jest
      .fn()
      .mockImplementation(({ children }: PropsWithChildren<unknown>) => {
        return <>{children}</>;
      }),
  };
});
jest.mock('@kbn/content-management-table-list-view', () => {
  const originalModule = jest.requireActual('@kbn/content-management-table-list-view-table');
  return {
    __esModule: true,
    ...originalModule,
    TableListView: jest.fn().mockReturnValue(null),
  };
});

const renderDashboardListing = (props: Partial<DashboardListingProps> = {}) =>
  render(<DashboardListing goToDashboard={jest.fn()} getDashboardUrl={jest.fn()} {...props} />, {
    wrapper: I18nProvider,
  });

test('initial filter is passed through', async () => {
  (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = false;

  renderDashboardListing({ initialFilter: 'kibanana' });

  expect(TableListView).toHaveBeenCalledWith(
    expect.objectContaining({ initialFilter: 'kibanana' }),
    expect.any(Object) // react context
  );
});

test('when showWriteControls is true, table list view is passed editing functions', async () => {
  (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = true;

  renderDashboardListing();

  expect(TableListView).toHaveBeenCalledWith(
    expect.objectContaining({
      createItem: expect.any(Function),
      deleteItems: expect.any(Function),
      editItem: expect.any(Function),
    }),
    expect.any(Object) // react context
  );
});

test('when showWriteControls is false, table list view is not passed editing functions', async () => {
  (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = false;
  renderDashboardListing();

  expect(TableListView).toHaveBeenCalledWith(
    expect.objectContaining({
      createItem: undefined,
      deleteItems: undefined,
      editItem: undefined,
    }),
    expect.any(Object) // react context
  );
});
