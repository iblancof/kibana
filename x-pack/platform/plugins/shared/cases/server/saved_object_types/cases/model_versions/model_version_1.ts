/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { casesSchemaV1 } from '../schemas';
/**
 * Adds custom fields to the cases SO.
 */
export const modelVersion1: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        customFields: {
          type: 'nested',
          properties: {
            key: {
              type: 'keyword',
            },
            type: {
              type: 'keyword',
            },
            value: {
              type: 'keyword',
              fields: {
                number: {
                  type: 'long',
                  ignore_malformed: true,
                },
                boolean: {
                  ignore_malformed: true,
                  type: 'boolean',
                },
                string: {
                  type: 'text',
                },
                date: {
                  type: 'date',
                  ignore_malformed: true,
                },
                ip: {
                  type: 'ip',
                  ignore_malformed: true,
                },
              },
            },
          },
        },
      },
    },
  ],
  schemas: {
    forwardCompatibility: casesSchemaV1.extends({}, { unknowns: 'ignore' }),
  },
};
