/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { esql, type ComposerQuery } from '@elastic/esql';
import { i18n } from '@kbn/i18n';
import type { LensConfig, LensSeriesLayer } from '@kbn/lens-embeddable-utils';
import type { ApmDataSourceWithSummary } from '../../../../../common/data_source';
import { ApmDocumentType } from '../../../../../common/document_type';
import {
  EVENT_OUTCOME,
  EVENT_SUCCESS_COUNT,
  METRIC_SYSTEM_CPU_PERCENT,
  METRIC_SYSTEM_FREE_MEMORY,
  METRIC_SYSTEM_TOTAL_MEMORY,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_DURATION,
  TRANSACTION_DURATION_HISTOGRAM,
  TRANSACTION_DURATION_SUMMARY,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import type { RollupInterval } from '../../../../../common/rollup';
import { ChartType, getTimeSeriesColor } from '../../charts/helper/get_timeseries_color';

export function getPreferredIndex(
  documentType: ApmDocumentType,
  rollupInterval: RollupInterval
): string {
  switch (documentType) {
    case ApmDocumentType.ServiceTransactionMetric:
      return `metrics-apm.service_transaction.${rollupInterval}-default`;
    case ApmDocumentType.TransactionMetric:
      return `metrics-apm.transaction.${rollupInterval}-default`;
    default:
      return 'traces-apm-*,apm-*';
  }
}

type FlyoutLensChartProcessorEvent = 'transaction' | 'metric' | undefined;

interface FlyoutLensChartConfigDefinition {
  id: string;
  title: string;
  titleAction?: ReactNode;
  config?: LensConfig;
}

type LensYAxis = LensSeriesLayer['yAxis'][number];

const TIME_BUCKET_FIELD = 'timestamp';
const TIME_BUCKET_BY = `${TIME_BUCKET_FIELD} = TBUCKET(100)`;

interface ServiceScope {
  serviceName: string;
  environment: string;
  transactionType?: string;
  kuery?: string;
}

function createBaseServiceQuery({
  indexes,
  processorEvent,
  scope,
}: {
  indexes: string;
  processorEvent: FlyoutLensChartProcessorEvent;
  scope: ServiceScope;
}): ComposerQuery {
  const { serviceName, environment, kuery, transactionType } = scope;

  const query = esql.from(indexes);

  if (processorEvent !== undefined) {
    query.where`${esql.col(PROCESSOR_EVENT)} == ${processorEvent}`;
  }

  query.where`${esql.col(SERVICE_NAME)} == ${serviceName}`;

  if (transactionType) {
    query.where`${esql.col(TRANSACTION_TYPE)} == ${transactionType}`;
  }

  if (environment !== ENVIRONMENT_ALL.value) {
    query.where`${esql.col(SERVICE_ENVIRONMENT)} == ${environment}`;
  }

  if (kuery) {
    query.where`KQL(${kuery})`;
  }

  return query;
}

function printQuery(query: ComposerQuery): string {
  return `${query.print('basic')}`;
}

const seriesColor = (chartType: ChartType) => getTimeSeriesColor(chartType).currentPeriodColor;

type LensYBounds = Extract<LensConfig, { chartType: 'xy' }>['yBounds'];

function buildChartDefinition({
  id,
  title,
  titleAction,
  indexes,
  buildQuery,
  yAxis,
  yBounds,
}: {
  id: string;
  title: string;
  titleAction?: ReactNode;
  indexes: string | undefined;
  buildQuery: (indexes: string) => ComposerQuery;
  yAxis: LensYAxis[];
  yBounds?: LensYBounds;
}): FlyoutLensChartConfigDefinition {
  if (!indexes) {
    return { id, title, titleAction };
  }

  const config: LensConfig = {
    chartType: 'xy',
    title,
    dataset: { esql: printQuery(buildQuery(indexes)) },
    layers: [
      {
        type: 'series',
        seriesType: 'line',
        xAxis: { field: TIME_BUCKET_FIELD, type: 'dateHistogram' },
        yAxis,
      },
    ],
    legend: { show: false },
    fittingFunction: 'Linear',
    axisTitleVisibility: {
      showXAxisTitle: false,
      showYAxisTitle: false,
      showYRightAxisTitle: false,
    },
    ...(yBounds ? { yBounds } : {}),
  };

  return { id, title, titleAction, config };
}

interface LatencyAggregationConfig {
  label: string;
  aggregation: string;
}

function getLatencyAggregationConfig(
  latencyAggregationType: LatencyAggregationType
): LatencyAggregationConfig {
  switch (latencyAggregationType) {
    case LatencyAggregationType.p95:
      return {
        label: i18n.translate('xpack.apm.serviceFlyout.latency95thSeriesLabel', {
          defaultMessage: '95th percentile',
        }),
        aggregation: 'PERCENTILE(duration_ms, 95)',
      };
    case LatencyAggregationType.p99:
      return {
        label: i18n.translate('xpack.apm.serviceFlyout.latency99thSeriesLabel', {
          defaultMessage: '99th percentile',
        }),
        aggregation: 'PERCENTILE(duration_ms, 99)',
      };
    case LatencyAggregationType.avg:
    default:
      return {
        label: i18n.translate('xpack.apm.serviceFlyout.latencyAverageSeriesLabel', {
          defaultMessage: 'Average latency',
        }),
        aggregation: 'AVG(duration_ms)',
      };
  }
}

export function getLatencyChartType(latencyAggregationType: LatencyAggregationType): ChartType {
  switch (latencyAggregationType) {
    case LatencyAggregationType.p95:
      return ChartType.LATENCY_P95;
    case LatencyAggregationType.p99:
      return ChartType.LATENCY_P99;
    case LatencyAggregationType.avg:
    default:
      return ChartType.LATENCY_AVG;
  }
}

interface MetricsLatencyAggregationConfig {
  label: string;
  statsExpr: string;
  resultColumn: string;
}

function getMetricsLatencyAggregationConfig(
  latencyAggregationType: LatencyAggregationType,
  hasDurationSummaryField: boolean
): MetricsLatencyAggregationConfig {
  const durationField = hasDurationSummaryField
    ? TRANSACTION_DURATION_SUMMARY
    : `TO_TDIGEST(${TRANSACTION_DURATION_HISTOGRAM})`;

  switch (latencyAggregationType) {
    case LatencyAggregationType.p95:
      return {
        label: i18n.translate('xpack.apm.serviceFlyout.latency95thSeriesLabel', {
          defaultMessage: '95th percentile',
        }),
        statsExpr: `PERCENTILE(${durationField}, 95)`,
        resultColumn: 'latency_us',
      };
    case LatencyAggregationType.p99:
      return {
        label: i18n.translate('xpack.apm.serviceFlyout.latency99thSeriesLabel', {
          defaultMessage: '99th percentile',
        }),
        statsExpr: `PERCENTILE(${durationField}, 99)`,
        resultColumn: 'latency_us',
      };
    case LatencyAggregationType.avg:
    default:
      return {
        label: i18n.translate('xpack.apm.serviceFlyout.latencyAverageSeriesLabel', {
          defaultMessage: 'Average latency',
        }),
        statsExpr: `PERCENTILE(${durationField}, 50)`,
        resultColumn: 'latency_us',
      };
  }
}

function getLatencyChart(
  source: ApmDataSourceWithSummary | undefined,
  indexes: string | undefined,
  scope: ServiceScope,
  latencyAggregationType: LatencyAggregationType,
  titleAction?: ReactNode
): FlyoutLensChartConfigDefinition {
  const title = i18n.translate('xpack.apm.serviceFlyout.latencyChartTitle', {
    defaultMessage: 'Latency',
  });

  const isMetrics =
    source?.documentType === ApmDocumentType.ServiceTransactionMetric ||
    source?.documentType === ApmDocumentType.TransactionMetric;

  if (isMetrics && source) {
    const { label, statsExpr, resultColumn } = getMetricsLatencyAggregationConfig(
      latencyAggregationType,
      source.hasDurationSummaryField
    );

    return buildChartDefinition({
      id: 'latency',
      title,
      titleAction,
      indexes,
      buildQuery: (idx) => {
        const query = createBaseServiceQuery({ indexes: idx, processorEvent: undefined, scope });
        query.pipe(`STATS ${resultColumn} = ${statsExpr} BY ${TIME_BUCKET_BY}`);
        query.pipe(`EVAL latency_ms = TO_DOUBLE(${resultColumn}) / 1000`);
        query.pipe(`KEEP timestamp, latency_ms`);
        query.pipe(`SORT timestamp`);
        return query;
      },
      yAxis: [
        {
          label,
          value: 'latency_ms',
          format: 'number',
          decimals: 0,
          suffix: ' ms',
          seriesColor: seriesColor(getLatencyChartType(latencyAggregationType)),
        },
      ],
    });
  }

  const { label, aggregation } = getLatencyAggregationConfig(latencyAggregationType);

  return buildChartDefinition({
    id: 'latency',
    title,
    titleAction,
    indexes,
    buildQuery: (idx) => {
      const query = createBaseServiceQuery({ indexes: idx, processorEvent: 'transaction', scope });
      query.pipe(`EVAL duration_ms = TO_DOUBLE(${TRANSACTION_DURATION}) / 1000`);
      query.pipe(`STATS ${aggregation} BY ${TIME_BUCKET_BY}`);
      return query;
    },
    yAxis: [
      {
        label,
        value: aggregation,
        format: 'number',
        decimals: 0,
        suffix: ' ms',
        seriesColor: seriesColor(getLatencyChartType(latencyAggregationType)),
      },
    ],
  });
}

function getThroughputChart(
  indexes: string | undefined,
  scope: ServiceScope
): FlyoutLensChartConfigDefinition {
  return buildChartDefinition({
    id: 'throughput',
    title: i18n.translate('xpack.apm.serviceFlyout.throughputChartTitle', {
      defaultMessage: 'Throughput',
    }),
    indexes,
    buildQuery: (idx) => {
      const query = createBaseServiceQuery({ indexes: idx, processorEvent: 'transaction', scope });
      query.pipe(`STATS COUNT(*) BY ${TIME_BUCKET_BY}`);
      return query;
    },
    yAxis: [
      {
        label: i18n.translate('xpack.apm.serviceFlyout.throughputSeriesLabel', {
          defaultMessage: 'Throughput',
        }),
        value: 'COUNT(*)',
        format: 'number',
        decimals: 0,
        seriesColor: seriesColor(ChartType.THROUGHPUT),
      },
    ],
  });
}

function getFailedTransactionRateChart(
  source: ApmDataSourceWithSummary | undefined,
  indexes: string | undefined,
  scope: ServiceScope
): FlyoutLensChartConfigDefinition {
  const title = i18n.translate('xpack.apm.serviceFlyout.failedTransactionRateChartTitle', {
    defaultMessage: 'Failed transaction rate',
  });

  const isMetrics =
    source?.documentType === ApmDocumentType.ServiceTransactionMetric ||
    source?.documentType === ApmDocumentType.TransactionMetric;

  return buildChartDefinition({
    id: 'failedTransactionRate',
    title,
    indexes,
    buildQuery: (idx) => {
      const query = createBaseServiceQuery({
        indexes: idx,
        processorEvent: isMetrics ? undefined : 'transaction',
        scope,
      });
      if (isMetrics) {
        query.pipe(
          `STATS success = SUM(${EVENT_SUCCESS_COUNT}), total = COUNT(${EVENT_SUCCESS_COUNT}) BY ${TIME_BUCKET_BY}`
        );
        query.pipe('EVAL failed_transaction_rate = TO_DOUBLE(total - success) / total');
      } else {
        query.pipe(
          `STATS failure = COUNT(*) WHERE TO_STRING(${EVENT_OUTCOME}) == "failure", all = COUNT(*) BY ${TIME_BUCKET_BY}`
        );
        query.pipe('EVAL failed_transaction_rate = TO_DOUBLE(failure) / all');
      }
      query.pipe('KEEP timestamp, failed_transaction_rate');
      query.pipe('SORT timestamp');
      return query;
    },
    yBounds: { mode: 'custom', lowerBound: 0, upperBound: 1 },
    yAxis: [
      {
        label: title,
        value: 'failed_transaction_rate',
        format: 'percent',
        decimals: 1,
        seriesColor: seriesColor(ChartType.FAILED_TRANSACTION_RATE),
      },
    ],
  });
}

function getCpuUsageChart(
  indexes: string | undefined,
  scope: ServiceScope
): FlyoutLensChartConfigDefinition {
  const cpuUsage = `AVG(TO_DOUBLE(${METRIC_SYSTEM_CPU_PERCENT}))`;
  const title = i18n.translate('xpack.apm.serviceFlyout.cpuUsageChartTitle', {
    defaultMessage: 'CPU usage',
  });

  return buildChartDefinition({
    id: 'cpuUsage',
    title,
    indexes,
    buildQuery: (idx) => {
      const query = createBaseServiceQuery({ indexes: idx, processorEvent: 'metric', scope });
      query.pipe(`STATS ${cpuUsage} BY ${TIME_BUCKET_BY}`);
      return query;
    },
    yBounds: { mode: 'custom', lowerBound: 0, upperBound: 1 },
    yAxis: [
      {
        label: title,
        value: cpuUsage,
        format: 'percent',
        decimals: 1,
        seriesColor: seriesColor(ChartType.CPU_USAGE),
      },
    ],
  });
}

function getMemoryUsageChart(
  indexes: string | undefined,
  scope: ServiceScope
): FlyoutLensChartConfigDefinition {
  const title = i18n.translate('xpack.apm.serviceFlyout.memoryUsageChartTitle', {
    defaultMessage: 'Memory usage',
  });

  return buildChartDefinition({
    id: 'memoryUsage',
    title,
    indexes,
    buildQuery: (idx) => {
      const query = createBaseServiceQuery({ indexes: idx, processorEvent: 'metric', scope });
      query.pipe(
        `STATS free = AVG(TO_DOUBLE(${METRIC_SYSTEM_FREE_MEMORY})), total = AVG(TO_DOUBLE(${METRIC_SYSTEM_TOTAL_MEMORY})) BY ${TIME_BUCKET_BY}`
      );
      query.pipe('EVAL memory_usage = 1 - free / total');
      query.pipe('KEEP timestamp, memory_usage');
      query.pipe('SORT timestamp');
      return query;
    },
    yBounds: { mode: 'custom', lowerBound: 0, upperBound: 1 },
    yAxis: [
      {
        label: title,
        value: 'memory_usage',
        format: 'percent',
        decimals: 1,
        seriesColor: seriesColor(ChartType.MEMORY_USAGE),
      },
    ],
  });
}

export function getChartDefinitions({
  source,
  serviceName,
  environment,
  kuery,
  transactionType,
  latencyAggregationType,
  latencyTitleAction,
}: {
  source: ApmDataSourceWithSummary | undefined;
  serviceName: string;
  environment: string;
  kuery: string;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
  latencyTitleAction?: ReactNode;
}): {
  keyMetrics: FlyoutLensChartConfigDefinition[];
  infrastructureMetrics: FlyoutLensChartConfigDefinition[];
} {
  const indexes = source
    ? getPreferredIndex(source.documentType, source.rollupInterval)
    : undefined;

  const scope: ServiceScope = { serviceName, environment, kuery, transactionType };
  const metricScope: ServiceScope = { serviceName, environment, kuery };

  return {
    keyMetrics: [
      getLatencyChart(source, indexes, scope, latencyAggregationType, latencyTitleAction),
      getThroughputChart(indexes, scope),
      getFailedTransactionRateChart(source, indexes, scope),
    ],
    infrastructureMetrics: [
      getCpuUsageChart(indexes, metricScope),
      getMemoryUsageChart(indexes, metricScope),
    ],
  };
}
