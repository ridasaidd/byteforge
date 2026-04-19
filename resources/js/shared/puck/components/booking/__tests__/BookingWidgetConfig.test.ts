import { describe, expect, it } from 'vitest';
import { BookingWidget } from '../BookingWidgetConfig';

describe('BookingWidget config', () => {
  it('migrates legacy primaryColor into explicit accent fields and forces legacy layout', () => {
    const result = BookingWidget.resolveData?.({
      props: {
        layoutMode: 'sections',
        serviceId: 0,
        primaryColor: '#ff0000',
        showPrices: true,
        successMessage: 'Booked',
        cardHoverBorderColor: { type: 'custom', value: '#123456' },
      },
    } as never);

    expect(result).toEqual({
      props: expect.objectContaining({
        layoutMode: 'legacy',
        headerBg: { type: 'custom', value: '#ff0000' },
        btnBg: { type: 'custom', value: '#ff0000' },
        slotBorderColor: { type: 'custom', value: '#ff0000' },
        slotColor: { type: 'custom', value: '#ff0000' },
        calendarSelectedBg: { type: 'custom', value: '#ff0000' },
        calendarTodayBorderColor: { type: 'custom', value: '#ff0000' },
        processingSpinnerColor: { type: 'custom', value: '#ff0000' },
        successIconColor: { type: 'custom', value: '#ff0000' },
        cardHoverBorderColor: { type: 'custom', value: '#123456' },
      }),
    });
    expect(result?.props).not.toHaveProperty('primaryColor');
  });

  it('does not expose section layout authoring fields', () => {
    expect(BookingWidget.fields).not.toHaveProperty('layoutMode');
    expect(BookingWidget.fields).not.toHaveProperty('sections');
  });
});
