import { LogOut, MonitorX, UserRound } from 'lucide-react';

import { useLogoutAllDevicesMutation, useLogoutMutation } from '@/features/auth/api/auth.api';
import { useAppSelector } from '@/app/store/hooks';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import Button from '@/shared/ui/Button';

const DashboardPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const { showError, showSuccess } = useToast();
  const [logout, { isLoading: isLogoutLoading }] = useLogoutMutation();
  const [logoutAllDevices, { isLoading: isLogoutAllLoading }] = useLogoutAllDevicesMutation();

  const handleLogout = async () => {
    try {
      const result = await logout().unwrap();
      showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      const result = await logoutAllDevices().unwrap();
      showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

  return (
    <main className="dashboard-shell">
      <section className="dashboard-panel">
        <div className="dashboard-profile">
          <span className="dashboard-profile__avatar">
            <UserRound size={32} aria-hidden="true" />
          </span>
          <div>
            <p className="state-panel__eyebrow">Authenticated</p>
            <h1>{user?.userName || 'DevLoopFeed user'}</h1>
            <p>{user?.email}</p>
          </div>
        </div>

        <div className="dashboard-actions">
          <Button variant="secondary" onClick={handleLogout} disabled={isLogoutLoading || isLogoutAllLoading}>
            <LogOut size={18} aria-hidden="true" />
            {isLogoutLoading ? 'Logging out...' : 'Log out'}
          </Button>
          <Button variant="danger" onClick={handleLogoutAllDevices} disabled={isLogoutLoading || isLogoutAllLoading}>
            <MonitorX size={18} aria-hidden="true" />
            {isLogoutAllLoading ? 'Logging out...' : 'Log out all devices'}
          </Button>
        </div>
      </section>
    </main>
  );
};

export default DashboardPage;
