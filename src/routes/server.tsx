import { swrFetcher } from "@/api/api";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ModelServer as Server, ModelForceUpdateResponse } from "@/types";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import useSWR from "swr";
import { HeaderButtonGroup } from "@/components/header-button-group";
import { deleteServer, forceUpdateServer } from "@/api/server";
import { ServerCard } from "@/components/server";
import { ActionButtonGroup } from "@/components/action-button-group";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { IconButton } from "@/components/xui/icon-button";
import { InstallCommandsMenu } from "@/components/install-commands";
import { NoteMenu } from "@/components/note-menu";
import { TerminalButton } from "@/components/terminal";
import { useServer } from "@/hooks/useServer";
import { joinIP } from "@/lib/utils";

import { useTranslation } from "react-i18next";

export default function ServerPage() {
    const { t } = useTranslation();
    const { data, mutate, error, isLoading } = useSWR<Server[]>("/api/v1/server", swrFetcher);
    const { serverGroups } = useServer();

    useEffect(() => {
        if (error)
            toast(t("Error"), {
                description: t("Results.ErrorFetchingResource", { error: error.message }),
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error]);

    const columns: ColumnDef<Server>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            header: "ID",
            accessorKey: "id",
            accessorFn: (row) => `${row.id}(${row.display_index})`,
        },
        {
            header: t("Name"),
            accessorKey: "name",
            accessorFn: (row) => row.name,
            cell: ({ row }) => {
                const s = row.original;
                return <div className="max-w-24 whitespace-normal break-words">{s.name}</div>;
            },
        },
        {
            header: t("Group"),
            accessorKey: "groups",
            accessorFn: (row) => {
                return (
                    serverGroups?.filter((sg) => sg.servers?.includes(row.id)).map((sg) => sg.group.id) || []
                );
            },
        },
        {
            id: "ip",
            header: "IP",
            cell: ({ row }) => {
                const s = row.original;
                return <div className="max-w-24 whitespace-normal break-words">{joinIP(s.geoip?.ip)}</div>;
            },
        },
        {
            header: t("Version"),
            accessorKey: "host.version",
            accessorFn: (row) => row.host.version || t("Unknown"),
        },
        {
            header: t("Enable") + t("DDNS"),
            accessorKey: "enableDDNS",
            accessorFn: (row) => row.enable_ddns ?? false,
        },
        {
            header: t("HideForGuest"),
            accessorKey: "hideForGuest",
            accessorFn: (row) => row.hide_for_guest ?? false,
        },
        {
            id: "installCommands",
            header: t("InstallCommands"),
            cell: () => <InstallCommandsMenu />,
        },
        {
            id: "note",
            header: t("Note"),
            cell: ({ row }) => {
                const s = row.original;
                return <NoteMenu note={{ private: s.note, public: s.public_note }} />;
            },
        },
        {
            id: "actions",
            header: t("Actions"),
            cell: ({ row }) => {
                const s = row.original;
                return (
                    <ActionButtonGroup
                        className="flex gap-2"
                        delete={{ fn: deleteServer, id: s.id, mutate: mutate }}
                    >
                        <>
                            <TerminalButton id={s.id} />
                            <ServerCard mutate={mutate} data={s} />
                        </>
                    </ActionButtonGroup>
                );
            },
        },
    ];

    const dataCache = useMemo(() => {
        return data ?? [];
    }, [data]);

    const table = useReactTable({
        data: dataCache,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const selectedRows = table.getSelectedRowModel().rows;

    return (
        <div className="px-8">
            <div className="flex mt-6 mb-4">
                <h1 className="text-3xl font-bold tracking-tight">{t("Server")}</h1>
                <HeaderButtonGroup
                    className="flex-2 flex ml-auto gap-2"
                    delete={{
                        fn: deleteServer,
                        id: selectedRows.map((r) => r.original.id),
                        mutate: mutate,
                    }}
                >
                    <IconButton
                        icon="update"
                        onClick={async () => {
                            const id = selectedRows.map((r) => r.original.id);
                            if (id.length < 1) {
                                toast(t("Error"), {
                                    description: t("Results.SelectAtLeastOneServer"),
                                });
                                return;
                            }

                            let resp: ModelForceUpdateResponse = {};
                            try {
                                resp = await forceUpdateServer(id);
                            } catch (e) {
                                console.error(e);
                                toast(t("Error"), {
                                    description: t("Results.UnExpectedError"),
                                });
                                return;
                            }
                            toast(t("Done"), {
                                description:  t("Results.ForceUpdate")
                                + (resp.success?.length ? t(`Success`) + ` [${resp.success.join(",")}]` : "")
                                + (resp.failure?.length ? t(`Failure`) + ` [${resp.failure.join(",")}]` : "")
                                + (resp.offline?.length ? t(`Offline`) + ` [${resp.offline.join(",")}]` : "")
                            });
                        }}
                    />
                </HeaderButtonGroup>
            </div>
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead key={header.id} className="text-sm">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                {t("Loading")}...
                            </TableCell>
                        </TableRow>
                    ) : table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className="text-xsm">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                {t("NoResults")}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
