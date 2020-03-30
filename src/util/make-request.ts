import request from 'request';
import { IRequest, ITeamleaderAuthResponse, ITeamleaderContactsResponse, IZohoUpdateResponse } from './interfaces';

const OAUTH_TOKEN_NAME = 'Bearer';

export function makeRequest(options: IRequest, token?: string): Promise<ITeamleaderContactsResponse | IZohoUpdateResponse | ITeamleaderAuthResponse> {
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
            if (err || body.error) {
                return reject(`Error in Zoho response: ${(err && err.message) || body.error}`);
            }

            resolve(body);
        });
    });
}

export function isContactResponse(response: ITeamleaderContactsResponse | IZohoUpdateResponse | ITeamleaderAuthResponse): response is ITeamleaderContactsResponse {
    const vendorContacts = (response as ITeamleaderContactsResponse);
    return Array.isArray(vendorContacts.data) && vendorContacts.data.length > 0 && vendorContacts.data[ 0 ].id !== undefined;
}

export function isUpdateResponse(response: ITeamleaderContactsResponse | IZohoUpdateResponse | ITeamleaderAuthResponse): response is IZohoUpdateResponse {
    const zohoError = (response as IZohoUpdateResponse);
    return Array.isArray(zohoError.data) && zohoError.data[ 0 ].code !== undefined;
}
