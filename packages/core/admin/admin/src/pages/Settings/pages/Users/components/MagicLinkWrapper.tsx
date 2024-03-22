import { IconButton } from '@strapi/design-system';
import { Duplicate } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { ContentBox } from '../../../../../components/ContentBox';
import { useNotification } from '../../../../../features/Notifications';
import { useClipboard } from '../../../../../hooks/useClipboard';

interface MagicLinkWrapperProps {
  children: string;
  target: string;
}

const MagicLinkWrapper = ({ children, target }: MagicLinkWrapperProps) => {
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const { copy } = useClipboard();

  const copyLabel = formatMessage({
    id: 'app.component.CopyToClipboard.label',
    defaultMessage: 'Copy to clipboard',
  });

  const handleClick = async () => {
    const didCopy = await copy(target);

    if (didCopy) {
      toggleNotification({
        type: 'info',
        message: formatMessage({ id: 'notification.link-copied' }),
      });
    }
  };

  return (
    <ContentBox
      endAction={
        <IconButton label={copyLabel} noBorder icon={<Duplicate />} onClick={handleClick} />
      }
      title={target}
      titleEllipsis
      subtitle={children}
      icon={<span style={{ fontSize: 32 }}>✉️</span>}
      iconBackground="neutral100"
    />
  );
};

export { MagicLinkWrapper };
export type { MagicLinkWrapperProps };
