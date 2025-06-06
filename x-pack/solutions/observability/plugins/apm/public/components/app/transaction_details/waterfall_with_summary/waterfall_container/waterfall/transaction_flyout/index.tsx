/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiSkeletonText,
  EuiPortal,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import React from 'react';
import type { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import { useFetcher, isPending } from '../../../../../../../hooks/use_fetcher';
import { TransactionMetadata } from '../../../../../../shared/metadata_table/transaction_metadata';
import { getSpanLinksTabContent } from '../../../../../../shared/span_links/span_links_tab_content';
import { TransactionSummary } from '../../../../../../shared/summary/transaction_summary';
import { TransactionActionMenu } from '../../../../../../shared/transaction_action_menu/transaction_action_menu';
import { FlyoutTopLevelProperties } from '../flyout_top_level_properties';
import { ResponsiveFlyout } from '../responsive_flyout';
import type { SpanLinksCount } from '../waterfall_helpers/waterfall_helpers';
import { DroppedSpansWarning } from './dropped_spans_warning';

interface Props {
  transactionId: string;
  traceId: string;
  onClose: () => void;
  errorCount?: number;
  rootTransactionDuration?: number;
  spanLinksCount: SpanLinksCount;
  flyoutDetailTab?: string;
  start: string;
  end: string;
}

export function TransactionFlyout({
  transactionId,
  traceId,
  onClose,
  errorCount = 0,
  rootTransactionDuration,
  spanLinksCount,
  flyoutDetailTab,
  start,
  end,
}: Props) {
  const { data: transaction, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/traces/{traceId}/transactions/{transactionId}', {
        params: { path: { traceId, transactionId }, query: { start, end } },
      });
    },
    [traceId, transactionId, start, end]
  );

  const isLoading = isPending(status);

  return (
    <EuiPortal>
      <ResponsiveFlyout onClose={onClose} ownFocus={true} maxWidth={false}>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h4>
                  {i18n.translate(
                    'xpack.apm.transactionDetails.transFlyout.transactionDetailsTitle',
                    {
                      defaultMessage: 'Transaction details',
                    }
                  )}
                </h4>
              </EuiTitle>
            </EuiFlexItem>

            {transaction && (
              <EuiFlexItem grow={false}>
                <TransactionActionMenu isLoading={false} transaction={transaction} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiSkeletonText isLoading={isLoading}>
            {transaction && (
              <TransactionFlyoutBody
                transaction={transaction!}
                errorCount={errorCount}
                rootTransactionDuration={rootTransactionDuration}
                spanLinksCount={spanLinksCount}
                flyoutDetailTab={flyoutDetailTab}
              />
            )}
          </EuiSkeletonText>
        </EuiFlyoutBody>
      </ResponsiveFlyout>
    </EuiPortal>
  );
}

function TransactionFlyoutBody({
  transaction,
  errorCount,
  rootTransactionDuration,
  spanLinksCount,
  flyoutDetailTab,
}: {
  transaction: Transaction;
  errorCount: number;
  rootTransactionDuration?: number;
  spanLinksCount: SpanLinksCount;
  flyoutDetailTab?: string;
}) {
  const spanLinksTabContent = getSpanLinksTabContent({
    spanLinksCount,
    traceId: transaction.trace?.id,
    spanId: transaction.transaction?.id,
    processorEvent: ProcessorEvent.transaction,
  });

  const tabs = [
    {
      id: 'metadata',
      name: i18n.translate('xpack.apm.propertiesTable.tabs.metadataLabel', {
        defaultMessage: 'Metadata',
      }),
      content: (
        <>
          <EuiSpacer size="m" />
          <TransactionMetadata transaction={transaction} />
        </>
      ),
    },
    ...(spanLinksTabContent ? [spanLinksTabContent] : []),
  ];

  const initialTab = tabs.find(({ id }) => id === flyoutDetailTab) ?? tabs[0];

  return (
    <>
      <FlyoutTopLevelProperties transaction={transaction} />
      <EuiSpacer size="m" />
      <TransactionSummary
        transaction={transaction}
        totalDuration={rootTransactionDuration}
        errorCount={errorCount}
        coldStartBadge={transaction.faas?.coldstart}
      />
      <EuiHorizontalRule margin="m" />
      <DroppedSpansWarning transactionDoc={transaction} />
      <EuiTabbedContent initialSelectedTab={initialTab} tabs={tabs} />
    </>
  );
}
