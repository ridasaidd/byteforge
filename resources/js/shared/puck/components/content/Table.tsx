/* eslint-disable react-refresh/only-export-components */
import { ComponentConfig } from '@puckeditor/core';
import { usePuckEditMode } from '@/shared/hooks';
import {
  type BorderRadiusValue,
  type BorderValue,
  type ColorValue,
  type ShadowValue,
  type ResponsiveDisplayValue,
  type ResponsiveHeightValue,
  type ResponsiveMaxHeightValue,
  type ResponsiveMaxWidthValue,
  type ResponsiveOverflowValue,
  type ResponsivePositionValue,
  type ResponsiveSpacingValue,
  type ResponsiveVisibilityValue,
  type ResponsiveWidthValue,
  type SpacingValue,
  displayField,
  layoutFields,
  layoutAdvancedFields,
  spacingFields,
  backgroundFields,
  createResponsiveSpacingField,
  effectsFields,
  advancedFields,
  extractDefaults,
  createConditionalResolver,
  buildLayoutCSS,
  isResponsiveValue,
} from '../../fields';

interface TableRow {
  cells: unknown[];
}

const DEFAULT_CELL_PADDING_MOBILE: SpacingValue = {
  top: '12',
  right: '12',
  bottom: '12',
  left: '12',
  unit: 'px',
  linked: true,
};

const DEFAULT_CELL_PADDING: ResponsiveSpacingValue = {
  mobile: DEFAULT_CELL_PADDING_MOBILE,
};

function normalizeTableCell(cell: unknown): string {
  if (typeof cell === 'string') {
    return cell;
  }

  if (typeof cell === 'number') {
    return String(cell);
  }

  if (cell && typeof cell === 'object' && '' in cell) {
    const nestedValue = (cell as Record<string, unknown>)[''];
    if (typeof nestedValue === 'string') {
      return nestedValue;
    }
  }

  return '';
}

function normalizeTableRow(row: Partial<TableRow> | undefined, fallbackCellCount: number): TableRow {
  if (Array.isArray(row?.cells) && row.cells.length > 0) {
    return {
      cells: row.cells.map((cell) => normalizeTableCell(cell)),
    };
  }

  return {
    cells: Array.from({ length: Math.max(fallbackCellCount, 1) }, () => ''),
  };
}

function getCellPaddingCssValue(value: ResponsiveSpacingValue | undefined): string {
  const spacing = value ? (isResponsiveValue(value) ? value.mobile : value) : DEFAULT_CELL_PADDING_MOBILE;

  return [spacing.top, spacing.right, spacing.bottom, spacing.left]
    .map((part) => `${part || '0'}${spacing.unit || 'px'}`)
    .join(' ');
}

export interface TableProps {
  id?: string;
  rows: TableRow[];
  columnCount?: number;
  hasHeader?: boolean;
  striped?: boolean;
  bordered?: boolean;
  headerBackgroundColor?: ColorValue;
  headerTextColor?: ColorValue;
  stripedRowBackgroundColor?: ColorValue;
  cellPadding?: ResponsiveSpacingValue;
  display?: ResponsiveDisplayValue;
  width?: ResponsiveWidthValue;
  height?: ResponsiveHeightValue;
  maxWidth?: ResponsiveMaxWidthValue;
  maxHeight?: ResponsiveMaxHeightValue;
  padding?: ResponsiveSpacingValue;
  margin?: ResponsiveSpacingValue;
  backgroundColor?: ColorValue;
  border?: BorderValue;
  borderRadius?: BorderRadiusValue;
  shadow?: ShadowValue;
  position?: ResponsivePositionValue;
  overflow?: ResponsiveOverflowValue;
  visibility?: ResponsiveVisibilityValue;
  customCss?: string;
}

const TableComponent = ({
  id,
  rows = [],
  columnCount = 3,
  hasHeader = true,
  striped = false,
  bordered = true,
  headerBackgroundColor,
  headerTextColor,
  stripedRowBackgroundColor,
  cellPadding,
  display,
  width,
  height,
  maxWidth,
  maxHeight,
  padding,
  margin,
  backgroundColor,
  border,
  borderRadius,
  shadow,
  position,
  overflow,
  visibility,
  customCss,
  puck,
}: TableProps & { puck?: { dragRef: ((element: Element | null) => void) | null } }) => {
  const isEditing = usePuckEditMode();
  const className = `table-${id}`;
  const tableElementClassName = `${className}-table`;
  const resolvedBackgroundColor = backgroundColor?.type === 'custom' ? backgroundColor.value : undefined;

  const layoutCss = buildLayoutCSS({
    className,
    display,
    width,
    height,
    maxWidth,
    maxHeight,
    padding,
    margin,
    backgroundColor: resolvedBackgroundColor,
    border,
    borderRadius,
    shadow,
    position,
    overflow,
    visibility,
  });

  const headerBgColor = headerBackgroundColor?.type === 'custom' ? headerBackgroundColor.value : '#f3f4f6';
  const headerTxtColor = headerTextColor?.type === 'custom' ? headerTextColor.value : '#000000';
  const stripedBgColor = stripedRowBackgroundColor?.type === 'custom' ? stripedRowBackgroundColor.value : '#f9fafb';

  const cellPaddingValue = getCellPaddingCssValue(cellPadding);

  const borderStyle = bordered ? '1px solid #e5e7eb' : 'none';

  const tableCss = [
    `.${className} { overflow-x: auto; }`,
    `.${tableElementClassName} { border-collapse: collapse; width: 100%; min-width: 100%; }`,
    `.${tableElementClassName} th { background-color: ${headerBgColor}; color: ${headerTxtColor}; padding: ${cellPaddingValue}; border: ${borderStyle}; text-align: left; font-weight: 600; }`,
    `.${tableElementClassName} td { padding: ${cellPaddingValue}; border: ${borderStyle}; }`,
    striped ? `.${tableElementClassName} tbody tr:nth-child(odd) { background-color: ${stripedBgColor}; }` : '',
  ].filter(Boolean).join('\n');

  const fallbackCellCount = Math.max(
    columnCount,
    rows.find((row) => Array.isArray(row?.cells) && row.cells.length > 0)?.cells.length ?? 0,
    1
  );

  const dataRows = rows && rows.length > 0
    ? rows.map((row) => normalizeTableRow(row, fallbackCellCount))
    : [
      { cells: Array(fallbackCellCount).fill('Column Header') },
      { cells: Array(fallbackCellCount).fill('Cell Data') },
    ];

  return (
    <>
      {isEditing && <style>{layoutCss}\n{tableCss}</style>}
      <div ref={puck?.dragRef} className={className}>
        <table className={tableElementClassName}>
          {hasHeader && dataRows.length > 0 && (
            <thead>
              <tr>
                {dataRows[0].cells.map((cell, idx) => (
                  <th key={`header-${idx}`}>{cell}</th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {(hasHeader ? dataRows.slice(1) : dataRows).map((row, rowIdx) => (
              <tr key={`row-${rowIdx}`}>
                {row.cells.map((cell, cellIdx) => (
                  <td key={`cell-${rowIdx}-${cellIdx}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {customCss && <style>{customCss}</style>}
    </>
  );
};

const tableContentFields = {
  rows: {
    type: 'array' as const,
    label: 'Rows',
    getItemSummary: (item: TableRow | undefined) => {
      if (!Array.isArray(item?.cells)) {
        return 'New row';
      }

      return `${item.cells.length} cells`;
    },
    defaultValue: [
      { cells: ['Header 1', 'Header 2', 'Header 3'] },
      { cells: ['Data 1', 'Data 2', 'Data 3'] },
      { cells: ['Data 4', 'Data 5', 'Data 6'] },
    ],
    arrayFields: {
      cells: {
        type: 'array' as const,
        label: 'Cells',
        getItemSummary: (item: unknown) => normalizeTableCell(item) || 'Empty cell',
        defaultValue: ['', '', ''],
        arrayFields: {
          '': { type: 'text' as const, label: 'Cell Content' },
        },
      },
    },
  },
  columnCount: {
    type: 'number' as const,
    label: 'Column Count',
    defaultValue: 3,
  },
  hasHeader: {
    type: 'radio' as const,
    label: 'Has Header Row',
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
    defaultValue: true,
  },
  striped: {
    type: 'radio' as const,
    label: 'Striped Rows',
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
    defaultValue: false,
  },
  bordered: {
    type: 'radio' as const,
    label: 'Bordered',
    options: [
      { label: 'Yes', value: true },
      { label: 'No', value: false },
    ],
    defaultValue: true,
  },
  cellPadding: createResponsiveSpacingField('Cell Padding', DEFAULT_CELL_PADDING),
  headerBackgroundColor: backgroundFields.backgroundColor,
  headerTextColor: backgroundFields.backgroundColor,
  stripedRowBackgroundColor: backgroundFields.backgroundColor,
};

export const Table: ComponentConfig<TableProps> = {
  label: 'Table',
  inline: true,

  resolveData: ({ props }) => {
    const typedProps = props as Partial<TableProps>;
    const rows = Array.isArray(typedProps.rows) ? typedProps.rows : [];
    const fallbackCellCount = Math.max(
      typedProps.columnCount ?? 3,
      rows.find((row) => Array.isArray(row?.cells) && row.cells.length > 0)?.cells.length ?? 0,
      1
    );

    return {
      props: {
        ...typedProps,
        rows: rows.map((row) => normalizeTableRow(row, fallbackCellCount)),
      },
    };
  },

  resolveFields: createConditionalResolver(
    [
      'rows',
      'columnCount',
      'hasHeader',
      'striped',
      'bordered',
      'cellPadding',
      'headerBackgroundColor',
      'headerTextColor',
      'stripedRowBackgroundColor',
      'display',
      'width',
      'height',
      'maxWidth',
      'maxHeight',
      'padding',
      'margin',
      'backgroundColor',
      'border',
      'borderRadius',
      'shadow',
      'position',
      'overflow',
      'visibility',
      'customCss',
    ],
    [
      {
        condition: (props) => props.striped === true,
        fieldKeys: ['stripedRowBackgroundColor'],
      },
      {
        condition: (props) => props.hasHeader === true,
        fieldKeys: ['headerBackgroundColor', 'headerTextColor'],
      },
    ]
  ),

  fields: {
    ...tableContentFields,
    ...displayField,
    width: layoutFields.width,
    height: layoutFields.height,
    maxWidth: layoutFields.maxWidth,
    maxHeight: layoutFields.maxHeight,
    ...spacingFields,
    ...backgroundFields,
    ...effectsFields,
    ...layoutAdvancedFields,
    ...advancedFields,
  },

  defaultProps: {
    ...extractDefaults(
      tableContentFields,
      displayField,
      { width: layoutFields.width },
      { height: layoutFields.height },
      { maxWidth: layoutFields.maxWidth },
      { maxHeight: layoutFields.maxHeight },
      spacingFields,
      backgroundFields,
      effectsFields,
      layoutAdvancedFields,
      advancedFields
    ),
    rows: [
      { cells: ['Header 1', 'Header 2', 'Header 3'] },
      { cells: ['Data 1', 'Data 2', 'Data 3'] },
      { cells: ['Data 4', 'Data 5', 'Data 6'] },
    ],
    columnCount: 3,
    hasHeader: true,
    striped: false,
    bordered: true,
    cellPadding: DEFAULT_CELL_PADDING,
    display: { mobile: 'block' as const },
    width: { mobile: { value: '100', unit: '%' as const } },
  },

  render: TableComponent,
};
