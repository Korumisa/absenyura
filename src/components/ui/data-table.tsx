import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils/utils';

export interface DataTableColumn<TData> {
  key: string;
  header: React.ReactNode;
  cell: (row: TData, index: number) => React.ReactNode;
  footer?: React.ReactNode | ((rows: TData[]) => React.ReactNode);
  className?: string;
}

export interface DataTableProps<TData> {
  columns: DataTableColumn<TData>[];
  rows: TData[];
  caption?: React.ReactNode;
  captionSrOnly?: boolean;
  getRowKey?: (row: TData, index: number) => React.Key;
  renderEmpty?: () => React.ReactNode;
  footer?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rowClassName?: string | ((row: TData, index: number) => string | undefined);
}

function DataTableInner<TData>(
  {
    columns,
    rows,
    caption,
    captionSrOnly = true,
    getRowKey,
    renderEmpty,
    footer = false,
    className,
    headerClassName,
    bodyClassName,
    rowClassName,
  }: DataTableProps<TData>,
  ref: React.ForwardedRef<HTMLTableElement>
) {
  const renderFooter = footer && columns.some((col) => col.footer !== undefined);

  return (
    <div className="relative w-full">
      <Table ref={ref} className={className}>
        {caption ? <caption className={cn(captionSrOnly && 'sr-only')}>{caption}</caption> : null}

        <TableHeader className={headerClassName}>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} scope="col" className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody className={bodyClassName}>
          {rows.length === 0 && renderEmpty ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-muted-foreground"
              >
                {renderEmpty()}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIndex) => {
              const key = getRowKey ? getRowKey(row, rowIndex) : rowIndex;
              const rc =
                typeof rowClassName === 'function' ? rowClassName(row, rowIndex) : rowClassName;
              return (
                <TableRow key={key} className={rc}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(row, rowIndex)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>

        {renderFooter ? (
          <TableFooter>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {typeof col.footer === 'function' ? col.footer(rows) : col.footer}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </div>
  );
}

DataTableInner.displayName = 'DataTable';

const DataTable = React.forwardRef(DataTableInner) as <TData>(
  props: DataTableProps<TData> & { ref?: React.ForwardedRef<HTMLTableElement> }
) => React.ReactElement | null;

export { DataTable };
