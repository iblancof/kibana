/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { Field, Aggregation, SplitField, AggFieldPair } from '@kbn/ml-anomaly-utils';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { MlJobService } from '../../../../services/job_service';
import type { MlApiServices } from '../../../../services/ml_api_service';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { JobCreator } from './job_creator';
import type {
  Job,
  Datafeed,
  Detector,
} from '../../../../../../common/types/anomaly_detection_jobs';
import { createBasicDetector } from './util/default_configs';
import { JOB_TYPE, CREATED_BY_LABEL } from '../../../../../../common/constants/new_job';
import { getRichDetectors } from './util/general';
import { isSparseDataJob } from './util/general';

export class MultiMetricJobCreator extends JobCreator {
  // a multi-metric job has one optional overall partition field
  // which is the same for all detectors.
  private _splitField: SplitField = null;

  protected _type: JOB_TYPE = JOB_TYPE.MULTI_METRIC;

  constructor(
    mlApiServices: MlApiServices,
    mlJobService: MlJobService,
    newJobCapsService: NewJobCapsService,
    indexPattern: DataView,
    savedSearch: SavedSearch | null,
    query: object
  ) {
    super(mlApiServices, mlJobService, newJobCapsService, indexPattern, savedSearch, query);
    this.createdBy = CREATED_BY_LABEL.MULTI_METRIC;
    this._wizardInitialized$.next(true);
  }

  // set the split field, applying it to each detector
  public setSplitField(field: SplitField) {
    this._splitField = field;

    if (this._splitField === null) {
      this.removeSplitField();
    } else {
      for (let i = 0; i < this._detectors.length; i++) {
        this._detectors[i].partition_field_name = this._splitField.id;
      }
    }
  }

  public removeSplitField() {
    this._detectors.forEach((d) => {
      delete d.partition_field_name;
    });
  }

  public get splitField(): SplitField {
    return this._splitField;
  }

  public addDetector(agg: Aggregation, field: Field) {
    const dtr: Detector = this._createDetector(agg, field);
    this._addDetector(dtr, agg, field);
  }

  public editDetector(agg: Aggregation, field: Field, index: number) {
    const dtr: Detector = this._createDetector(agg, field);
    this._editDetector(dtr, agg, field, index);
  }

  // create a new detector object, applying the overall split field
  private _createDetector(agg: Aggregation, field: Field) {
    const dtr: Detector = createBasicDetector(agg, field);

    if (this._splitField !== null) {
      dtr.partition_field_name = this._splitField.id;
    }
    return dtr;
  }

  public removeDetector(index: number) {
    this._removeDetector(index);
  }

  public get aggFieldPairs(): AggFieldPair[] {
    return this.detectors.map((d, i) => ({
      field: this._fields[i],
      agg: this._aggs[i],
    }));
  }

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    this.createdBy = CREATED_BY_LABEL.MULTI_METRIC;
    this._sparseData = isSparseDataJob(job, datafeed);
    const detectors = getRichDetectors(
      this.newJobCapsService,
      job,
      datafeed,
      this.additionalFields,
      false
    );

    if (datafeed.aggregations !== undefined) {
      // if we've converting from a single metric job,
      // delete the aggregations.
      delete datafeed.aggregations;
      delete job.analysis_config.summary_count_field_name;
    }

    this.removeAllDetectors();

    detectors.forEach((d, i) => {
      const dtr = detectors[i];
      if (dtr.agg !== null && dtr.field !== null) {
        this.addDetector(dtr.agg, dtr.field);
      }
    });
    if (detectors.length) {
      if (detectors[0].partitionField !== null) {
        this.setSplitField(detectors[0].partitionField);
      }
    }
  }
}
