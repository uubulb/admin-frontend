interface CommonResponse<T> {
    success: boolean;
    error: string;
    data: T;
}

function buildUrl(path: string, data?: any): string {
    if (!data)
        return path
    const url = new URL(path);
    for (const key in data) {
        url.searchParams.append(key, data[key]);
    }
    return url.toString();
}

export enum FetcherMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    PATCH = "PATCH",
    DELETE = "DELETE",
}

export async function fetcher<T>(method: FetcherMethod, path: string, data?: any): Promise<T> {
    let response;
    if (method === FetcherMethod.GET || method === FetcherMethod.DELETE) {
        response = await fetch(buildUrl(path, data), {
            method: "GET",
        });
    } else {
        response = await fetch(path, {
            method: method,
            headers: {
                "Content-Type": "application/json",
            },
            body: data ? JSON.stringify(data) : null,
        });
    }
    if (!response.ok) {
        throw new Error(response.statusText);
    }
    const responseData: CommonResponse<T> = await response.json();
    if (!responseData.success) {
        throw new Error(responseData.error);
    }
    return responseData.data;
}
