import request from 'request';
import {
    IRequest,
    ITeamleaderAuthResponse,
    ITeamleaderContactResponse,
    ITeamleaderContactsResponse,
    ITeamleaderUpdateResponse
} from './interfaces';

const OAUTH_TOKEN_NAME = 'Bearer';

export class AccessTokenExpiredException implements Error {
    public message: string;
    public name: string;
    constructor() {
        this.message = 'Access token for Teamleader has expired. Use refresh token to get a new pair';
        this.name = 'ACCESS_TOKEN_EXPIRED';
    }
}

export function makeRequest(options: IRequest, token?: string): Promise<ITeamleaderContactResponse | ITeamleaderContactsResponse | ITeamleaderUpdateResponse | ITeamleaderAuthResponse> {
    const reqOptions = {
        ...options,
        json: true,
    };
    if (token) {
        reqOptions.headers = reqOptions.headers || {};
        reqOptions.headers.Authorization = `${OAUTH_TOKEN_NAME} ${token}`;
    }
    return new Promise((resolve, reject) => {
        request(reqOptions, (err, resp, body) => {
            if (err) {
                return reject(`Error in Teamleader response: ${(err && err.message)}`);
            }

            if (isAccessTokenExpired(body)) {
                return reject(new AccessTokenExpiredException());
            }

            if (resp.statusCode !== 200) {
                body = body || {};
                body.code = resp.statusCode;
            }
            resolve(body);
        });
    });
}

function isAccessTokenExpired(body: any): boolean {
    return body &&
        body.errors &&
        Array.isArray(body.errors) &&
        body.errors.some((error: { title: string, status: number }) => error.title.includes('Access token'));
}

export function isContactResponse(response: ITeamleaderContactResponse | ITeamleaderContactsResponse | ITeamleaderUpdateResponse | ITeamleaderAuthResponse): response is ITeamleaderContactsResponse {
    const vendorContacts = (response as ITeamleaderContactsResponse);
    return Array.isArray(vendorContacts.data) && vendorContacts.data.length > 0 && vendorContacts.data[ 0 ].id !== undefined;
}

export function isUpdateResponse(response: ITeamleaderContactResponse | ITeamleaderContactsResponse | ITeamleaderUpdateResponse | ITeamleaderAuthResponse): response is ITeamleaderUpdateResponse {
    const changedEntries = (response as ITeamleaderUpdateResponse);
    return changedEntries.code !== undefined;
}
