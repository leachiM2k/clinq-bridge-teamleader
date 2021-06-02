import { Contact, ContactTemplate, ContactUpdate } from '@clinq/bridge';
import querystring from 'querystring';
import { authorizeApiKey } from './access-token';
import { convertContactToVendorContact, convertVendorContactToContact } from './contact';
import {
    ITeamleaderAuthResponse,
    ITeamleaderContactResponse,
    RequestMethods
} from './interfaces';
import { AccessTokenExpiredException, isContactResponse, isUpdateResponse, makeRequest } from './make-request';
import parseEnvironment from './parse-environment';

const apiDomain = 'https://api.focus.teamleader.eu';

async function _createContact(
    accessToken: string,
    contact: ContactTemplate
): Promise<Contact> {
    const vendorContact = convertContactToVendorContact(contact);

    const reqOptions = {
        url: `${apiDomain}/contacts.add`,
        method: RequestMethods.POST,
        body: vendorContact
    };
    const response = await makeRequest(reqOptions, accessToken);

    if (!response || !isUpdateResponse(response) || !response.data || !response.data.id) {
        throw new Error(`Could not create Teamleader contact.`);
    }

    return getSingleContact(response.data.id, accessToken);
}

async function _updateContact(
    accessToken: string,
    contact: ContactUpdate
): Promise<Contact> {
    const vendorContact = convertContactToVendorContact(contact, contact.id);

    const reqOptions = {
        url: `${apiDomain}/contacts.update`,
        method: RequestMethods.POST,
        body: vendorContact
    };
    const response = await makeRequest(reqOptions, accessToken);

    if (!response || !isUpdateResponse(response) || response.code !== 204) {
        throw new Error(`Could not update Teamleader contact.`);
    }

    return getSingleContact(contact.id, accessToken);
}

async function getSingleContact(id: string, accessToken: string): Promise<Contact> {
    const reqGetOptions = {
        url: `${apiDomain}/contacts.info`,
        method: RequestMethods.GET,
        body: { id }
    };
    const responseGet = await makeRequest(reqGetOptions, accessToken);

    const receivedContact = convertVendorContactToContact((responseGet as ITeamleaderContactResponse).data);
    if (!receivedContact) {
        throw new Error("Could not parse received contact");
    }
    return receivedContact;
}

async function _getContacts(
    accessToken: string,
    page: number = 1,
    previousContacts?: Contact[]
): Promise<Contact[]> {
    const reqOptions = {
        url: `${apiDomain}/contacts.list`,
        method: RequestMethods.GET,
        body: { page: { size: 20, number: page } }
    };

    const response = await makeRequest(reqOptions, accessToken);

    if (!isContactResponse(response)) {
        return previousContacts || [];
    }

    const contacts: Contact[] = previousContacts || [];

    for (const vendorContact of response.data) {
        const contact = convertVendorContactToContact(vendorContact);
        if (contact) {
            contacts.push(contact);
        }
    }

    if (response.data.length > 0) {
        return _getContacts(accessToken, page + 1, contacts);
    }

    return contacts;
}

async function _deleteContact(accessToken: string, id: string): Promise<void> {
    const reqDeleteOptions = {
        url: `${apiDomain}/contacts.delete`,
        method: RequestMethods.POST,
        body: { id }
    };
    const response = await makeRequest(reqDeleteOptions, accessToken);

    if (!response || !isUpdateResponse(response) || response.code !== 204) {
        throw new Error(`Could not delete Teamleader contact.`);
    }
}

const refreshTokenOnError = <T, A extends [any] | any[]>(fn: (accessToken: string, ...a: A) => Promise<T>): ((apiKey: string, ...args: A) => Promise<T>) => {
    return async (apiKey: string, ...args: A) => {
        let { accessToken, refreshToken } = await authorizeApiKey(apiKey, false);

        try {
            return await fn(accessToken, ...args);
        } catch (e) {
            if (e instanceof AccessTokenExpiredException) {
                const refreshedToken = await authorizeApiKey(apiKey, true);
                accessToken = refreshedToken.accessToken;
                refreshToken = refreshedToken.refreshToken;
                // TODO: we need to write the refresh token back!! Otherwise the credentials will stop working in 2 * 1 hour
                // console.log('*************************** accessToken', accessToken);
                // console.log('*************************** refreshToken', refreshToken);
                return fn(accessToken, ...args);
            }
            throw e;
        }
    };
};

export const createContact = refreshTokenOnError(_createContact);
export const updateContact = refreshTokenOnError(_updateContact);
export const getContacts = refreshTokenOnError(_getContacts);
export const deleteContact = refreshTokenOnError(_deleteContact);

export function getTokens(code: string): Promise<ITeamleaderAuthResponse> {
    const { TEAMLEADER_CLIENT_ID, TEAMLEADER_CLIENT_SECRET, TEAMLEADER_REDIRECT_URL } = parseEnvironment();
    const reqOptions = {
        url: `https://focus.teamleader.eu/oauth2/access_token`,
        method: RequestMethods.POST,
        body: {
            code,
            redirect_uri: TEAMLEADER_REDIRECT_URL,
            client_id: TEAMLEADER_CLIENT_ID,
            client_secret: TEAMLEADER_CLIENT_SECRET,
            grant_type: 'authorization_code'
        }
    };
    return makeRequest(reqOptions) as Promise<ITeamleaderAuthResponse>;
}

export function getOAuth2RedirectUrl(): string {
    const { TEAMLEADER_CLIENT_ID, TEAMLEADER_REDIRECT_URL } = parseEnvironment();
    return 'https://focus.teamleader.eu/oauth2/authorize?' + querystring.encode({
            client_id: TEAMLEADER_CLIENT_ID,
            response_type: 'code',
            redirect_uri: TEAMLEADER_REDIRECT_URL
        }
    );
}
