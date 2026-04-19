import type { ComponentConfig } from '@puckeditor/core';
import { PaymentWidgetRender } from './PaymentWidget';
import type { PaymentWidgetProps } from './types';

export const PaymentWidget: ComponentConfig<PaymentWidgetProps> = {
  label: 'Payment Widget',
  fields: {},
  defaultProps: {},
  render: (props) => <PaymentWidgetRender {...props} />,
};
