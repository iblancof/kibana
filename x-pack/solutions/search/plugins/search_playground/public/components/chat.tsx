/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Controller, FieldErrors, useFormContext } from 'react-hook-form';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiHideFor,
  EuiHorizontalRule,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { v4 as uuidv4 } from 'uuid';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { AnalyticsEvents } from '../analytics/constants';
import { useAutoBottomScroll } from '../hooks/use_auto_bottom_scroll';
import { ChatSidebar } from './chat_sidebar';
import { useChat } from '../hooks/use_chat';
import { PlaygroundForm, PlaygroundFormFields, ChatRequestData, MessageRole } from '../types';

import { MessageList } from './message_list/message_list';
import { QuestionInput } from './question_input';

import { TelegramIcon } from './telegram_icon';
import { transformFromChatMessages } from '../utils/transform_to_messages';
import { useUsageTracker } from '../hooks/use_usage_tracker';
import { PlaygroundBodySection } from './playground_body_section';
import { elasticsearchQueryString } from '../utils/user_query';

const buildFormData = (
  formData: PlaygroundForm,
  formErrors: FieldErrors<PlaygroundForm>
): ChatRequestData => ({
  connector_id: formData[PlaygroundFormFields.summarizationModel]!.connectorId!,
  prompt: formData[PlaygroundFormFields.prompt],
  indices: formData[PlaygroundFormFields.indices].join(),
  citations: formData[PlaygroundFormFields.citations],
  elasticsearch_query: elasticsearchQueryString(
    formData[PlaygroundFormFields.elasticsearchQuery],
    formData[PlaygroundFormFields.userElasticsearchQuery],
    formErrors[PlaygroundFormFields.userElasticsearchQuery]
  ),
  summarization_model: formData[PlaygroundFormFields.summarizationModel]!.value,
  source_fields: JSON.stringify(formData[PlaygroundFormFields.sourceFields]),
  doc_size: formData[PlaygroundFormFields.docSize],
});

export const Chat = () => {
  const { euiTheme } = useEuiTheme();
  const {
    control,
    formState: { isValid, isSubmitting, errors: formErrors },
    resetField,
    handleSubmit,
    getValues,
  } = useFormContext<PlaygroundForm>();
  const { messages, append, stop: stopRequest, setMessages, reload } = useChat();
  const messagesRef = useAutoBottomScroll();
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const usageTracker = useUsageTracker();
  const onSubmit = async (data: PlaygroundForm) => {
    await append(
      { content: data.question, role: MessageRole.user, createdAt: new Date() },
      {
        data: buildFormData(data, formErrors),
      }
    );
    usageTracker?.click(AnalyticsEvents.chatQuestionSent);

    resetField(PlaygroundFormFields.question);
  };
  const handleStopRequest = () => {
    stopRequest();
    usageTracker?.click(AnalyticsEvents.chatRequestStopped);
  };
  const chatMessages = useMemo(
    () => [
      {
        id: uuidv4(),
        role: MessageRole.system,
        content: 'Welcome! Ask a question to get started.',
      },
      ...transformFromChatMessages(messages),
    ],
    [messages]
  );

  const isToolBarActionsDisabled = useMemo(
    () => chatMessages.length <= 1 || isRegenerating || isSubmitting,
    [chatMessages, isSubmitting, isRegenerating]
  );

  const regenerateMessages = async () => {
    setIsRegenerating(true);
    const formData = getValues();
    await reload({
      data: buildFormData(formData, formErrors),
    });
    setIsRegenerating(false);

    usageTracker?.click(AnalyticsEvents.chatRegenerateMessages);
  };
  const handleClearChat = () => {
    setMessages([]);
    usageTracker?.click(AnalyticsEvents.chatCleared);
  };

  useEffect(() => {
    usageTracker?.load(AnalyticsEvents.chatPageLoaded);
  }, [usageTracker]);

  return (
    <PlaygroundBodySection>
      <EuiForm
        component="form"
        css={{ display: 'flex', flexGrow: 1 }}
        onSubmit={handleSubmit(onSubmit)}
        data-test-subj="chatPage"
      >
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem
            grow={2}
            css={{
              paddingTop: euiTheme.size.l,
              paddingBottom: euiTheme.size.l,
              // don't allow the chat to shrink below 66.6% of the screen
              flexBasis: 0,
              minWidth: '66.6%',
            }}
          >
            <EuiFlexGroup direction="column" className="eui-fullHeight">
              {/* // Set scroll at the border of parent element*/}
              <EuiFlexGroup
                direction="column"
                className="eui-yScroll"
                css={{ paddingLeft: euiTheme.size.l, paddingRight: euiTheme.size.l }}
                tabIndex={0}
                ref={messagesRef}
              >
                <MessageList messages={chatMessages} />
              </EuiFlexGroup>

              <EuiFlexItem
                grow={false}
                css={{ paddingLeft: euiTheme.size.l, paddingRight: euiTheme.size.l }}
              >
                <EuiHorizontalRule margin="none" />

                <EuiSpacer size="s" />

                <EuiFlexGroup responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconType="sparkles"
                      disabled={isToolBarActionsDisabled}
                      onClick={regenerateMessages}
                      size="xs"
                      data-test-subj="regenerateActionButton"
                    >
                      <FormattedMessage
                        id="xpack.searchPlayground.chat.regenerateBtn"
                        defaultMessage="Regenerate"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconType="refresh"
                      disabled={isToolBarActionsDisabled}
                      onClick={handleClearChat}
                      size="xs"
                      data-test-subj="clearChatActionButton"
                    >
                      <FormattedMessage
                        id="xpack.searchPlayground.chat.clearChatBtn"
                        defaultMessage="Clear chat"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>

                <EuiSpacer size="s" />

                <Controller
                  name={PlaygroundFormFields.question}
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <QuestionInput
                      value={field.value}
                      onChange={field.onChange}
                      isDisabled={isSubmitting || isRegenerating}
                      button={
                        isSubmitting || isRegenerating ? (
                          <EuiButtonIcon
                            data-test-subj="stopRequestButton"
                            aria-label={i18n.translate(
                              'xpack.searchPlayground.chat.stopButtonAriaLabel',
                              {
                                defaultMessage: 'Stop request',
                              }
                            )}
                            display="base"
                            size="s"
                            iconType="stop"
                            onClick={handleStopRequest}
                          />
                        ) : (
                          <EuiButtonIcon
                            aria-label={i18n.translate(
                              'xpack.searchPlayground.chat.sendButtonAriaLabel',
                              {
                                defaultMessage: 'Send a question',
                              }
                            )}
                            display={isValid ? 'base' : 'empty'}
                            size="s"
                            type="submit"
                            isLoading={isSubmitting}
                            isDisabled={!isValid}
                            iconType={TelegramIcon}
                            data-test-subj="sendQuestionButton"
                          />
                        )
                      }
                    />
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiHideFor sizes={['xs', 's']}>
            <EuiFlexItem grow={1} css={{ flexBasis: 0, minWidth: '33.3%' }}>
              <ChatSidebar />
            </EuiFlexItem>
          </EuiHideFor>
        </EuiFlexGroup>
      </EuiForm>
    </PlaygroundBodySection>
  );
};
