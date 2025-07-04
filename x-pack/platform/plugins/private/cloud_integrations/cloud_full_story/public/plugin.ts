/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  IStaticAssets,
  PluginInitializerContext,
  CoreSetup,
  Plugin,
} from '@kbn/core/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import { duration } from 'moment';

interface SetupFullStoryDeps {
  analytics: AnalyticsServiceSetup;
  staticAssets: IStaticAssets;
}

export interface CloudFullStoryConfig {
  org_id?: string;
  eventTypesAllowlist: string[];
  pageVarsDebounceTime: string;
}

interface CloudFullStorySetupDeps {
  cloud: CloudSetup;
}

export class CloudFullStoryPlugin implements Plugin {
  private readonly config: CloudFullStoryConfig;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CloudFullStoryConfig>();
  }

  public setup(core: CoreSetup, { cloud }: CloudFullStorySetupDeps) {
    if (cloud.isCloudEnabled) {
      if (cloud.isElasticStaffOwned) {
        this.initializerContext.logger
          .get()
          .info('Skipping FullStory setup for a Elastic-owned deployments');
        return;
      }
      this.setupFullStory({
        analytics: core.analytics,
        staticAssets: core.http.staticAssets,
      }).catch((e) => {
        this.initializerContext.logger
          .get()
          .debug(`Error setting up FullStory: ${e.toString()}`, { error: e });
      });
    }
  }

  public start() {}

  public stop() {}

  /**
   * If the right config is provided, register the FullStory shipper to the analytics client.
   * @param analytics Core's Analytics service's setup contract.
   * @param staticAssets Core's http.staticAssets helper.
   * @internal
   */
  private async setupFullStory({ analytics, staticAssets }: SetupFullStoryDeps) {
    const { org_id: fullStoryOrgId, eventTypesAllowlist, pageVarsDebounceTime } = this.config;
    if (!fullStoryOrgId) {
      return; // do not load any FullStory code in the browser if not enabled
    }

    // Keep this import async so that we do not load any FullStory code into the browser when it is disabled.
    const { FullStoryShipper } = await import('@elastic/ebt/shippers/fullstory');
    analytics.registerShipper(FullStoryShipper, {
      eventTypesAllowlist,
      fullStoryOrgId,
      // Duration configs get stringified when forwarded to the UI and need reconversion
      ...(pageVarsDebounceTime
        ? { pageVarsDebounceTimeMs: duration(pageVarsDebounceTime).asMilliseconds() }
        : {}),
      scriptUrl: staticAssets.getPluginAssetHref('fs.js'),
      namespace: 'FSKibana',
      // Tell FullStory to not capture from the start and wait for the opt-in confirmation
      captureOnStartup: false,
    });
  }
}
