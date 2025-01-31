import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tab, Tabs } from '@patternfly/react-core';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useWorkspaceInfo } from '../../utils/workspace-context-utils';
import ReleasePlanListView from './ReleasePlan/ReleasePlanListView';
import ReleasePlanAdmissionListView from './ReleasePlanAdmission/ReleasePlanAdmissionListView';
import ReleaseStrategyListView from './ReleaseStrategy/ReleaseStrategyListView';

const RELEASE_SERVICE_TAB_KEY = 'release-service-tab-key';

export const ReleaseService: React.FC = () => {
  const params = useParams();
  const { workspace } = useWorkspaceInfo();
  const { releaseTab: activeTab } = params;
  const [lastSelectedTab, setLocalStorageItem] = useLocalStorage<string>(RELEASE_SERVICE_TAB_KEY);
  const currentTab = activeTab || lastSelectedTab || 'release-plan';

  const navigate = useNavigate();
  const setActiveTab = React.useCallback(
    (newTab: string) => {
      if (currentTab !== newTab) {
        navigate(`/application-pipeline/release/workspaces/${workspace}/${newTab}`);
      }
    },
    [currentTab, navigate, workspace],
  );

  React.useEffect(() => {
    if (activeTab !== lastSelectedTab) {
      setLocalStorageItem(currentTab);
    }
  }, [activeTab, lastSelectedTab, currentTab, setLocalStorageItem]);

  React.useEffect(() => {
    if (!activeTab && lastSelectedTab) {
      navigate(`/application-pipeline/release/workspaces/${workspace}/${lastSelectedTab}`, {
        replace: true,
      });
    }
  }, [activeTab, lastSelectedTab, navigate, workspace]);
  return (
    <Tabs activeKey={currentTab} onSelect={(_, k: string) => setActiveTab(k)}>
      <Tab key="release-plan" eventKey="release-plan" title="Release Plan">
        <ReleasePlanListView />
      </Tab>
      <Tab
        key="release-plan-admission"
        eventKey="release-plan-admission"
        title="Release Plan Admission"
      >
        <ReleasePlanAdmissionListView />
      </Tab>
      <Tab key="release-strategy" eventKey="release-strategy" title="Release Strategy">
        <ReleaseStrategyListView />
      </Tab>
    </Tabs>
  );
};
