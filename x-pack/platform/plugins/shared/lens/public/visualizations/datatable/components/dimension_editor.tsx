/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSwitch, EuiButtonGroup, htmlIdGenerator } from '@elastic/eui';
import {
  CUSTOM_PALETTE,
  CustomPaletteParams,
  PaletteOutput,
  PaletteRegistry,
  applyPaletteParams,
  canCreateCustomMatch,
  getFallbackDataBounds,
} from '@kbn/coloring';
import { getColorCategories } from '@kbn/chart-expressions-common';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { getOriginalId } from '@kbn/transpose-utils';
import { KbnPalettes } from '@kbn/palettes';
import { DatatableInspectorTables } from '../../../../common/expressions';
import type { VisualizationDimensionEditorProps } from '../../../types';
import type { DatatableVisualizationState } from '../visualization';

import {
  defaultPaletteParams,
  findMinMaxByColumnId,
  getAccessorType,
} from '../../../shared_components';
import { CollapseSetting } from '../../../shared_components/collapse_setting';
import { ColorMappingByValues } from '../../../shared_components/coloring/color_mapping_by_values';
import { ColorMappingByTerms } from '../../../shared_components/coloring/color_mapping_by_terms';
import { getColumnAlignment } from '../utils';
import { FormatFactory } from '../../../../common/types';
import { getDatatableColumn } from '../../../../common/expressions/impl/datatable/utils';

const idPrefix = htmlIdGenerator()();

type ColumnType = DatatableVisualizationState['columns'][number];

function updateColumn(
  state: DatatableVisualizationState,
  columnId: string,
  newColumn: Partial<ColumnType>
) {
  return state.columns.map((currentColumn) => {
    if (currentColumn.columnId === columnId) {
      return { ...currentColumn, ...newColumn };
    } else {
      return currentColumn;
    }
  });
}

export type TableDimensionEditorProps =
  VisualizationDimensionEditorProps<DatatableVisualizationState> & {
    paletteService: PaletteRegistry;
    palettes: KbnPalettes;
    isDarkMode: boolean;
    formatFactory: FormatFactory;
  };

export function TableDimensionEditor(props: TableDimensionEditorProps) {
  const { frame, accessor, isInlineEditing, isDarkMode, formatFactory } = props;
  const column = props.state.columns.find(({ columnId }) => accessor === columnId);
  const { inputValue: localState, handleInputChange: setLocalState } =
    useDebouncedValue<DatatableVisualizationState>({
      value: props.state,
      onChange: props.setState,
    });

  const updateColumnState = useCallback(
    (columnId: string, newColumn: Partial<ColumnType>) => {
      setLocalState({
        ...localState,
        columns: updateColumn(localState, columnId, newColumn),
      });
    },
    [setLocalState, localState]
  );

  if (!column) return null;
  if (column.isTransposed) return null;

  const currentData =
    frame.activeData?.[localState.layerId] ?? frame.activeData?.[DatatableInspectorTables.Default];
  const columnMeta = getDatatableColumn(currentData, accessor)?.meta;
  const formatter = formatFactory(columnMeta?.params);
  const allowCustomMatch = canCreateCustomMatch(columnMeta);
  const datasource = frame.datasourceLayers?.[localState.layerId];

  const { isNumeric, isCategory: isBucketable } = getAccessorType(datasource, accessor);
  const showColorByTerms = isBucketable;
  const showDynamicColoringFeature = isBucketable || isNumeric;
  const currentAlignment = getColumnAlignment(column, isNumeric);
  const currentColorMode = column?.colorMode || 'none';
  const hasDynamicColoring = currentColorMode !== 'none';
  const visibleColumnsCount = localState.columns.filter((c) => !c.hidden).length;

  const hasTransposedColumn = localState.columns.some(({ isTransposed }) => isTransposed);
  const columnsToCheck = hasTransposedColumn
    ? currentData?.columns.filter(({ id }) => getOriginalId(id) === accessor).map(({ id }) => id) ||
      []
    : [accessor];
  const minMaxByColumnId = findMinMaxByColumnId(columnsToCheck, currentData);
  const currentMinMax = minMaxByColumnId.get(accessor) ?? getFallbackDataBounds();

  const activePalette: PaletteOutput<CustomPaletteParams> = {
    type: 'palette',
    name: showColorByTerms ? 'default' : defaultPaletteParams.name,
    ...column?.palette,
    params: { ...column?.palette?.params },
  };
  // need to tell the helper that the colorStops are required to display
  const displayStops = applyPaletteParams(props.paletteService, activePalette, currentMinMax);

  if (activePalette.name !== CUSTOM_PALETTE && activePalette.params?.stops) {
    activePalette.params.stops = applyPaletteParams(
      props.paletteService,
      activePalette,
      currentMinMax
    );
  }

  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.table.alignment.label', {
          defaultMessage: 'Text alignment',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          legend={i18n.translate('xpack.lens.table.alignment.label', {
            defaultMessage: 'Text alignment',
          })}
          data-test-subj="lnsDatatable_alignment_groups"
          buttonSize="compressed"
          options={[
            {
              id: `${idPrefix}left`,
              label: i18n.translate('xpack.lens.table.alignment.left', {
                defaultMessage: 'Left',
              }),
              'data-test-subj': 'lnsDatatable_alignment_groups_left',
            },
            {
              id: `${idPrefix}center`,
              label: i18n.translate('xpack.lens.table.alignment.center', {
                defaultMessage: 'Center',
              }),
              'data-test-subj': 'lnsDatatable_alignment_groups_center',
            },
            {
              id: `${idPrefix}right`,
              label: i18n.translate('xpack.lens.table.alignment.right', {
                defaultMessage: 'Right',
              }),
              'data-test-subj': 'lnsDatatable_alignment_groups_right',
            },
          ]}
          idSelected={`${idPrefix}${currentAlignment}`}
          onChange={(id) => {
            const newMode = id.replace(idPrefix, '') as ColumnType['alignment'];
            updateColumnState(accessor, { alignment: newMode });
          }}
        />
      </EuiFormRow>
      {showDynamicColoringFeature && (
        <>
          <EuiFormRow
            display="columnCompressed"
            fullWidth
            label={i18n.translate('xpack.lens.table.dynamicColoring.label', {
              defaultMessage: 'Color by value',
            })}
          >
            <EuiButtonGroup
              isFullWidth
              legend={i18n.translate('xpack.lens.table.dynamicColoring.label', {
                defaultMessage: 'Color by value',
              })}
              data-test-subj="lnsDatatable_dynamicColoring_groups"
              buttonSize="compressed"
              options={[
                {
                  id: `${idPrefix}none`,
                  label: i18n.translate('xpack.lens.table.dynamicColoring.none', {
                    defaultMessage: 'None',
                  }),
                  'data-test-subj': 'lnsDatatable_dynamicColoring_groups_none',
                },
                {
                  id: `${idPrefix}cell`,
                  label: i18n.translate('xpack.lens.table.dynamicColoring.cell', {
                    defaultMessage: 'Cell',
                  }),
                  'data-test-subj': 'lnsDatatable_dynamicColoring_groups_cell',
                },
                {
                  id: `${idPrefix}text`,
                  label: i18n.translate('xpack.lens.table.dynamicColoring.text', {
                    defaultMessage: 'Text',
                  }),
                  'data-test-subj': 'lnsDatatable_dynamicColoring_groups_text',
                },
              ]}
              idSelected={`${idPrefix}${currentColorMode}`}
              onChange={(id) => {
                const newMode = id.replace(idPrefix, '') as ColumnType['colorMode'];
                const params: Partial<ColumnType> = {
                  colorMode: newMode,
                };
                if (!column?.palette && newMode !== 'none') {
                  params.palette = {
                    ...activePalette,
                    params: {
                      ...activePalette.params,
                      // that's ok, at first open we're going to throw them away and recompute
                      stops: displayStops,
                    },
                  };
                }

                // clear up when switching to no coloring
                if (newMode === 'none') {
                  params.palette = undefined;
                  params.colorMapping = undefined;
                }
                updateColumnState(accessor, params);
              }}
            />
          </EuiFormRow>

          {hasDynamicColoring &&
            (showColorByTerms ? (
              <ColorMappingByTerms
                isDarkMode={isDarkMode}
                colorMapping={column.colorMapping}
                palette={activePalette}
                palettes={props.palettes}
                isInlineEditing={isInlineEditing}
                setPalette={(palette) => {
                  updateColumnState(accessor, { palette, colorMapping: undefined });
                }}
                setColorMapping={(colorMapping) => {
                  updateColumnState(accessor, { colorMapping });
                }}
                paletteService={props.paletteService}
                panelRef={props.panelRef}
                categories={getColorCategories(currentData?.rows, accessor, [null])}
                formatter={formatter}
                allowCustomMatch={allowCustomMatch}
              />
            ) : (
              <ColorMappingByValues
                palette={activePalette}
                isInlineEditing={isInlineEditing}
                setPalette={(newPalette) => {
                  updateColumnState(accessor, { palette: newPalette });
                }}
                paletteService={props.paletteService}
                panelRef={props.panelRef}
                dataBounds={currentMinMax}
              />
            ))}
        </>
      )}
      {!column.isTransposed && (
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.lens.table.columnVisibilityLabel', {
            defaultMessage: 'Hide column',
          })}
          display="columnCompressed"
        >
          <EuiSwitch
            compressed
            label={i18n.translate('xpack.lens.table.columnVisibilityLabel', {
              defaultMessage: 'Hide column',
            })}
            showLabel={false}
            data-test-subj="lns-table-column-hidden"
            checked={Boolean(column?.hidden)}
            disabled={!column.hidden && visibleColumnsCount <= 1}
            onChange={() => {
              const newState = {
                ...localState,
                columns: localState.columns.map((currentColumn) => {
                  if (currentColumn.columnId === accessor) {
                    return {
                      ...currentColumn,
                      hidden: !column.hidden,
                    };
                  } else {
                    return currentColumn;
                  }
                }),
              };
              setLocalState(newState);
            }}
          />
        </EuiFormRow>
      )}
      {props.groupId === 'rows' && (
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.lens.table.columnFilterClickLabel', {
            defaultMessage: 'Directly filter on click',
          })}
          display="columnCompressed"
        >
          <EuiSwitch
            compressed
            label={i18n.translate('xpack.lens.table.columnFilterClickLabel', {
              defaultMessage: 'Directly filter on click',
            })}
            showLabel={false}
            data-test-subj="lns-table-column-one-click-filter"
            checked={Boolean(column?.oneClickFilter)}
            disabled={column.hidden}
            onChange={() => {
              const newState = {
                ...localState,
                columns: localState.columns.map((currentColumn) => {
                  if (currentColumn.columnId === accessor) {
                    return {
                      ...currentColumn,
                      oneClickFilter: !column.oneClickFilter,
                    };
                  } else {
                    return currentColumn;
                  }
                }),
              };
              setLocalState(newState);
            }}
          />
        </EuiFormRow>
      )}
    </>
  );
}

export function TableDimensionDataExtraEditor(
  props: VisualizationDimensionEditorProps<DatatableVisualizationState> & {
    paletteService: PaletteRegistry;
  }
) {
  const { state, setState, accessor } = props;
  const column = state.columns.find(({ columnId }) => accessor === columnId);

  if (!column) return null;
  if (column.isTransposed) return null;

  return (
    <>
      {props.groupId === 'rows' && (
        <CollapseSetting
          value={column.collapseFn || ''}
          onChange={(collapseFn) => {
            setState({
              ...state,
              columns: updateColumn(state, accessor, { collapseFn }),
            });
          }}
        />
      )}
    </>
  );
}
