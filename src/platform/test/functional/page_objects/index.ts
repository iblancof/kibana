/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CommonPageObject } from './common_page';
import { ConsolePageObject } from './console_page';
import { ContextPageObject } from './context_page';
import { DashboardPageObject } from './dashboard_page';
import { DiscoverPageObject } from './discover_page';
import { ErrorPageObject } from './error_page';
import { ExportPageObject } from './export_page';
import { HeaderPageObject } from './header_page';
import { HomePageObject } from './home_page';
import { NewsfeedPageObject } from './newsfeed_page';
import { SettingsPageObject } from './settings_page';
import { SharePageObject } from './share_page';
import { LoginPageObject } from './login_page';
import { TimePickerPageObject } from './time_picker';
import { TimelionPageObject } from './timelion_page';
import { VisualBuilderPageObject } from './visual_builder_page';
import { VisualizePageObject } from './visualize_page';
import { VisualizeEditorPageObject } from './visualize_editor_page';
import { VisualizeChartPageObject } from './visualize_chart_page';
import { TimeToVisualizePageObject } from './time_to_visualize_page';
import { TagCloudPageObject } from './tag_cloud_page';
import { VegaChartPageObject } from './vega_chart_page';
import { SavedObjectsPageObject } from './management/saved_objects_page';
import { LegacyDataTableVisPageObject } from './legacy/data_table_vis';
import { IndexPatternFieldEditorPageObject } from './management/indexpattern_field_editor_page';
import { DashboardPageControls } from './dashboard_page_controls';
import { DashboardPageLinks } from './dashboard_page_links';
import { UnifiedSearchPageObject } from './unified_search_page';
import { UnifiedFieldListPageObject } from './unified_field_list';
import { UnifiedTabsPageObject } from './unified_tabs';
import { FilesManagementPageObject } from './files_management';
import { AnnotationEditorPageObject } from './annotation_library_editor_page';
import { SolutionNavigationProvider } from './solution_navigation';
import { EmbeddedConsoleProvider } from './embedded_console';
import { SpaceSettingsPageObject } from './space_settings';

export const pageObjects = {
  annotationEditor: AnnotationEditorPageObject,
  common: CommonPageObject,
  console: ConsolePageObject,
  context: ContextPageObject,
  dashboard: DashboardPageObject,
  dashboardControls: DashboardPageControls,
  dashboardLinks: DashboardPageLinks,
  discover: DiscoverPageObject,
  embeddedConsole: EmbeddedConsoleProvider,
  error: ErrorPageObject,
  exports: ExportPageObject,
  header: HeaderPageObject,
  home: HomePageObject,
  newsfeed: NewsfeedPageObject,
  settings: SettingsPageObject,
  share: SharePageObject,
  solutionNavigation: SolutionNavigationProvider,
  legacyDataTableVis: LegacyDataTableVisPageObject,
  login: LoginPageObject,
  timelion: TimelionPageObject,
  timePicker: TimePickerPageObject,
  visualBuilder: VisualBuilderPageObject,
  visualize: VisualizePageObject,
  visEditor: VisualizeEditorPageObject,
  visChart: VisualizeChartPageObject,
  timeToVisualize: TimeToVisualizePageObject,
  tagCloud: TagCloudPageObject,
  vegaChart: VegaChartPageObject,
  savedObjects: SavedObjectsPageObject,
  indexPatternFieldEditorObjects: IndexPatternFieldEditorPageObject,
  unifiedSearch: UnifiedSearchPageObject,
  unifiedFieldList: UnifiedFieldListPageObject,
  unifiedTabs: UnifiedTabsPageObject,
  filesManagement: FilesManagementPageObject,
  spaceSettings: SpaceSettingsPageObject,
};

export { SolutionNavigationProvider } from './solution_navigation';
