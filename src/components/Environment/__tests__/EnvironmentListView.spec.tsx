import * as React from 'react';
import '@testing-library/jest-dom';
import { useFeatureFlag } from '@openshift/dynamic-plugin-sdk';
import { render, screen, configure, cleanup, fireEvent, within } from '@testing-library/react';
import { getMockWorkflows } from '../../../components/ApplicationDetails/__data__/WorkflowTestUtils';
import { useAllApplicationEnvironmentsWithHealthStatus } from '../../../hooks/useAllApplicationEnvironmentsWithHealthStatus';
import { useAllEnvironments } from '../../../hooks/useAllEnvironments';
import { mockLocation } from '../../../utils/test-utils';
import { mockAppEnvWithHealthStatus } from '../__data__/mockAppEnvWithHealthStatus';
import { EnvironmentType } from '../environment-utils';
import EnvironmentListView from '../EnvironmentListView';

mockLocation();

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  useK8sWatchResource: jest.fn(() => [[], true]),
  getActiveWorkspace: jest.fn(() => 'test-ws'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({ t: (x) => x })),
}));

jest.mock('react-router-dom', () => ({
  useSearchParams: () => {
    const [params, setParams] = React.useState(() => new URLSearchParams());
    const setParamsCb = React.useCallback((newParams: URLSearchParams) => {
      setParams(newParams);
      window.location.search = `?${newParams.toString()}`;
    }, []);
    return [params, setParamsCb];
  },
  Link: (props) => <a href={props.to}>{props.children}</a>,
}));

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  useFeatureFlag: jest.fn(),
}));

jest.mock('../../../hooks/useAllApplicationEnvironmentsWithHealthStatus', () => ({
  useAllApplicationEnvironmentsWithHealthStatus: jest.fn(),
}));

jest.mock('../../../hooks/useAllEnvironments', () => ({
  useAllEnvironments: jest.fn(),
}));

const useFeatureFlagMock = useFeatureFlag as jest.Mock;
const useAllEnvironmentsMock = useAllEnvironments as jest.Mock;
const useAllApplicationEnvironmentsWithHealthStatusMock =
  useAllApplicationEnvironmentsWithHealthStatus as jest.Mock;

const { workflowMocks, applyWorkflowMocks } = getMockWorkflows();

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  useFeatureFlag: jest.fn(),
}));

jest.mock('../../../utils/rbac', () => ({
  useAccessReviewForModel: jest.fn(() => [true, true]),
}));

configure({ testIdAttribute: 'data-test' });

describe('EnvironmentListView', () => {
  beforeEach(() => {
    applyWorkflowMocks(workflowMocks);

    useAllApplicationEnvironmentsWithHealthStatusMock.mockReturnValue([
      mockAppEnvWithHealthStatus,
      true,
    ]);
    useAllEnvironmentsMock.mockReturnValue([mockAppEnvWithHealthStatus, true]);
    useFeatureFlagMock.mockReturnValue([false]);
  });

  it('should render spinner while environment data is not loaded', () => {
    useAllEnvironmentsMock.mockReturnValue([[], false]);
    render(<EnvironmentListView />);
    expect(screen.getByRole('progressbar')).toBeVisible();
  });

  it('should render empty state if no environment is present', () => {
    useAllEnvironmentsMock.mockReturnValue([[], true]);
    render(<EnvironmentListView />);
    expect(
      screen.getByText(
        /An environment is a set of compute resources that you can use to develop, test, and stage your applications./,
      ),
    ).toBeVisible();
    expect(screen.getByText(/Manage your deployments/)).toBeVisible();
    const createEnv = screen.queryByText('Create environment');
    expect(createEnv).toBeVisible();
    const disabledEnv = screen.queryByTestId('disabled-create-env');
    expect(disabledEnv).toBeFalsy();
  });

  it('should render cards when environment(s) is(are) present', () => {
    render(<EnvironmentListView />);
    // const createEnv = screen.queryByText('Create environment');
    // expect(createEnv)[0].toBeVisible();
    expect(screen.getAllByTestId('environment-card').length).toBe(
      mockAppEnvWithHealthStatus.length,
    );
  });

  it('should render environment(s) in order based on parentEnvironments', () => {
    useAllApplicationEnvironmentsWithHealthStatusMock.mockReturnValue([
      mockAppEnvWithHealthStatus.slice(0, 3),
      true,
    ]);

    render(<EnvironmentListView validTypes={[EnvironmentType.default, EnvironmentType.static]} />);
    const environmentCards = screen.getAllByTestId('environment-card');
    within(environmentCards[0]).getByText('Development');
    within(environmentCards[1]).getByText('Staging');
    within(environmentCards[2]).getByText('Production');
  });

  it('should pre-filter environments by type', () => {
    render(<EnvironmentListView validTypes={[]} />);
    expect(screen.queryAllByTestId('environment-card')).toHaveLength(0);

    cleanup();
    render(<EnvironmentListView validTypes={[EnvironmentType.default]} />);
    expect(screen.getAllByTestId('environment-card')).toHaveLength(1);

    cleanup();
    render(<EnvironmentListView validTypes={[EnvironmentType.managed]} />);
    expect(screen.queryAllByTestId('environment-card')).toHaveLength(1);

    cleanup();
    render(<EnvironmentListView validTypes={[EnvironmentType.static]} />);
    expect(screen.queryAllByTestId('environment-card')).toHaveLength(2);

    cleanup();
    render(<EnvironmentListView validTypes={[EnvironmentType.static, EnvironmentType.default]} />);
    expect(screen.getAllByTestId('environment-card')).toHaveLength(3);
  });

  it('should filter cards by type', async () => {
    render(<EnvironmentListView />);
    expect(screen.getAllByTestId('environment-card')).toHaveLength(4);

    // interact with filters
    const filterMenuButton = screen.getByRole('button', { name: /filter/i });
    fireEvent.click(filterMenuButton);

    const defaultCb = screen.getByLabelText(/Default/i, {
      selector: 'input',
    }) as HTMLInputElement;
    fireEvent.click(defaultCb);
    expect(defaultCb.checked).toBe(true);
    expect(screen.getAllByTestId('environment-card')).toHaveLength(1);

    const staticCb = screen.getByLabelText(/Static/i, { selector: 'input' }) as HTMLInputElement;
    fireEvent.click(staticCb);
    expect(staticCb.checked).toBe(true);
    expect(screen.getAllByTestId('environment-card')).toHaveLength(3);

    const managedCb = screen.getByLabelText(/Self Managed/i, {
      selector: 'input',
    }) as HTMLInputElement;
    fireEvent.click(managedCb);
    expect(managedCb.checked).toBe(true);
    expect(screen.getAllByTestId('environment-card')).toHaveLength(4);

    // filter only some of the envs
    fireEvent.click(staticCb);
    fireEvent.click(managedCb);
    expect(screen.queryAllByTestId('environment-card')).toHaveLength(1);

    // clear the filter
    const clearFilterButton = screen.getAllByRole('button', { name: 'Clear filters' })[1];
    fireEvent.click(clearFilterButton);
    expect(screen.getAllByTestId('environment-card')).toHaveLength(4);
  });

  it('should filter cards by name', () => {
    render(<EnvironmentListView />);
    expect(screen.getAllByTestId('environment-card')).toHaveLength(4);

    const nameSearchInput = screen.getByTestId('env-name-filter-input');
    const textFilterInput = nameSearchInput.querySelector('.pf-v5-c-text-input-group__text-input');
    fireEvent.change(textFilterInput, { target: { value: 'd' } });
    expect(screen.getAllByTestId('environment-card')).toHaveLength(2);
    fireEvent.change(textFilterInput, { target: { value: 'dev' } });
    expect(screen.getAllByTestId('environment-card')).toHaveLength(1);
  });

  it('should clear filters from empty state', () => {
    render(<EnvironmentListView />);
    expect(screen.getAllByTestId('environment-card')).toHaveLength(4);

    const nameSearchInput = screen.getByTestId('env-name-filter-input');
    const textFilterInput = nameSearchInput.querySelector('.pf-v5-c-text-input-group__text-input');
    fireEvent.change(textFilterInput, { target: { value: 'no match' } });

    expect(screen.queryAllByTestId('environment-card')).toHaveLength(0);

    const clearFilterButton = screen.getByRole('button', { name: 'Clear all filters' });
    fireEvent.click(clearFilterButton);
    expect(screen.getAllByTestId('environment-card')).toHaveLength(4);
  });

  it('should filter cards by status', async () => {
    render(<EnvironmentListView applicationName="application-to-test" />);
    expect(screen.getAllByTestId('environment-card')).toHaveLength(4);

    // interact with filters
    const filterMenuButton = screen.getByRole('button', { name: /filter/i });
    fireEvent.click(filterMenuButton);

    const missingFilter = screen.getByLabelText(/Missing/i, {
      selector: 'input',
    }) as HTMLInputElement;
    fireEvent.click(missingFilter);
    await expect(missingFilter.checked).toBe(true);
    expect(screen.getAllByTestId('environment-card')).toHaveLength(3);

    const degradedFilter = screen.getByLabelText(/Degraded/i, {
      selector: 'input',
    }) as HTMLInputElement;
    fireEvent.click(degradedFilter);
    expect(screen.getAllByTestId('environment-card')).toHaveLength(3);

    fireEvent.click(missingFilter);
    expect(screen.queryAllByTestId('environment-card')).toHaveLength(0);

    // clear the filter
    const clearFilterButton = screen.getAllByRole('button', { name: 'Clear filters' })[1];
    fireEvent.click(clearFilterButton);
    await expect(screen.getAllByTestId('environment-card')).toHaveLength(4);
  });

  it('should contain Healthy application status', () => {
    useAllApplicationEnvironmentsWithHealthStatusMock.mockReturnValue([
      mockAppEnvWithHealthStatus,
      true,
    ]);
    render(<EnvironmentListView applicationName="test" />);
    screen.getByText('Healthy');
  });

  it('should contain application Missing status', () => {
    useAllApplicationEnvironmentsWithHealthStatusMock.mockReturnValue([
      [mockAppEnvWithHealthStatus[0]],
      true,
    ]);
    render(<EnvironmentListView applicationName="test" />);
    screen.queryByText('Missing');
  });
});
