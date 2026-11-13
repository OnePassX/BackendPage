"use client"

import * as React from "react"
import { ChevronRightIcon, ChevronDownIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

// ── Types ──

export interface TreeColumn<T> {
    id: string
    label: string
    className?: string
    cell: (item: T, depth: number) => React.ReactNode
}

export interface DataTableTreeProps<T extends { id: number; children?: T[] }> {
    columns: TreeColumn<T>[]
    data: T[]
    loading?: boolean
    expanded?: boolean
    searchPlaceholder?: string
    searchFilter?: (item: T, search: string) => boolean
    toolbarActions?: React.ReactNode
    getRowClassName?: (item: T, depth: number) => string | undefined
}

// ── helpers ──

function collectAllIds<T extends { id: number; children?: T[] }>(items: T[]): Set<number> {
    const ids = new Set<number>()
    const walk = (list: T[]) => {
        for (const item of list) {
            ids.add(item.id)
            if (item.children) walk(item.children)
        }
    }
    walk(items)
    return ids
}

function collectSecondIds<T extends { id: number; children?: T[] }>(items: T[]): Set<number> {
    const ids = new Set<number>()
    const walk = (list: T[]) => {
        for (const item of list) {
            ids.add(item.id)
        }
    }
    walk(items)
    return ids
}

// ── Component ──

export function DataTableTree<T extends {
    id: number; children?: T[], type?: any;
}>({
    columns,
    data,
    loading = false,
    expanded = false,
    searchPlaceholder = "搜索...",
    searchFilter,
    toolbarActions,
    getRowClassName,
}: DataTableTreeProps<T>) {
    const [expandedIds, setExpandedIds] = React.useState<Set<number>>(new Set<number>())
    const [search, setSearch] = React.useState("")

    // keep expandedIds in sync when data changes
    React.useEffect(() => {
        expanded == true && setExpandedIds(collectAllIds(data))
    }, [data,expanded])

    const toggleExpand = (id: number) => {
        setExpandedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const expandAll = () => setExpandedIds(collectAllIds(data))
    const collapseAll = () => setExpandedIds(new Set<number>())

    // ── search filter (check node and all descendants) ──
    const matchesSearch = (item: T): boolean => {
        if (!search || !searchFilter) return true
        if (searchFilter(item, search)) return true
        if (item.children) return item.children.some(matchesSearch)
        return false
    }

    // ── render visible rows recursively ──
    const renderRows = (items: T[], depth = 0, parentId?: number): React.ReactNode[] => {
        const rows: React.ReactNode[] = []
        for (const item of items) {
            if (!matchesSearch(item)) continue
            const hasChildren = item.children && item.children.length > 0
            const isExpanded = expandedIds.has(item.id)
            const visible = depth === 0 || (parentId !== undefined && expandedIds.has(parentId)) || search.length > 0
            if (!visible) continue
            // console.log("visible", item)
            const rowClass = getRowClassName?.(item, depth)
            rows.push(
                <TableRow key={`${item.type}_${item.id}`} className={rowClass}>
                    {columns.map((col) => {
                        const isTreeCol = col === columns[0]
                        return (
                            <TableCell key={col.id} className={col.className}>
                                {isTreeCol ? (
                                    <div
                                        className="flex items-center gap-1"
                                        style={{ paddingLeft: `${depth * 20}px` }}
                                    >
                                        {hasChildren ? (
                                            <button
                                                onClick={() => toggleExpand(item.id)}
                                                className="rounded p-0.5 hover:bg-accent"
                                            >
                                                {isExpanded ? (
                                                    <ChevronDownIcon className="size-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                                                )}
                                            </button>
                                        ) : (
                                            <span className="inline-block size-5" />
                                        )}
                                        {col.cell(item, depth)}
                                    </div>
                                ) : (
                                    col.cell(item, depth)
                                )}
                            </TableCell>
                        )
                    })}
                </TableRow>,
            )

            if (hasChildren && isExpanded) {
                rows.push(...renderRows(item.children!, depth + 1, item.id))
            }
        }
        return rows
    }

    const visibleRows = renderRows(data)
    const totalCols = columns.length

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="relative w-72">
                    <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                        placeholder={searchPlaceholder}
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                {toolbarActions ? (
                    <div className="flex items-center gap-2">
                        {toolbarActions}
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={expandAll}>
                            展开全部
                        </Button>
                        <Button variant="outline" size="sm" onClick={collapseAll}>
                            收起全部
                        </Button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
                <Table className="">
                    <TableHeader className="sticky top-0 z-10 bg-muted">
                        <TableRow>
                            {columns.map((col) => (
                                <TableHead key={col.id} className={col.className}>
                                    {col.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={totalCols} className="py-8 text-center text-muted-foreground">
                                    加载中...
                                </TableCell>
                            </TableRow>
                        ) : visibleRows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={totalCols} className="py-8 text-center text-muted-foreground">
                                    暂无数据
                                </TableCell>
                            </TableRow>
                        ) : (
                            visibleRows
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
