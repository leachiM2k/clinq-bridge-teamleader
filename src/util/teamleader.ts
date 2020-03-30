import { Contact, ContactTemplate, ContactUpdate } from '@clinq/bridge';
import querystring from 'querystring';
import { authorizeApiKey } from './access-token';
import { convertContactToVendorContact, convertVendorContactToContact } from './contact';
import {
    ITeamleaderAuthResponse,
    ITeamleaderContactResponse,
    RequestMethods
} from './interfaces';
import { isContactResponse, isUpdateResponse, makeRequest } from './make-request';
import parseEnvironment from './parse-environment';

const apiDomain = 'https://api.teamleader.eu';

export async function createContact(
    apiKey: string,
    contact: ContactTemplate
): Promise<Contact> {
    if (typeof apiKey !== "string" || !apiKey || apiKey.trim().length === 0) {
        throw new Error("Invalid API key.");
    }
    const [accessToken, refreshToken] = apiKey.split(":");

    if (!refreshToken) {
        throw new Error('Could not extract refresh token from api key');
    }

    const vendorContactContact = convertContactToVendorContact(contact);

    const reqOptions = {
        url: `${apiDomain}/contacts.add`,
        method: RequestMethods.POST,
        body: vendorContactContact
    };
    // TODO: handle expired access token
    const response = await makeRequest(reqOptions, accessToken);

    if (!response || !isUpdateResponse(response) || !response.data || !response.data.id) {
        throw new Error(`Could not create Teamleader contact.`);
    }

    return getSingleContact(response.data.id, accessToken);
}

export async function updateContact(
    apiKey: string,
    contact: ContactUpdate
): Promise<Contact> {
    const { accessToken } = await authorizeApiKey(apiKey);
    const vendorContactContact = convertContactToVendorContact(contact, contact.id);

    const reqOptions = {
        url: `${apiDomain}/contacts.update`,
        method: RequestMethods.PUT,
        body: { data: [vendorContactContact] }
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

export async function getContacts(
    apiKey: string,
    page: number = 1,
    previousContacts?: Contact[]
): Promise<Contact[]> {
    if (typeof apiKey !== "string" || !apiKey || apiKey.trim().length === 0) {
        throw new Error("Invalid API key.");
    }
    const [accessToken, refreshToken] = apiKey.split(":");

    if (!refreshToken) {
        throw new Error('Could not extract refresh token from api key');
    }

    const reqOptions = {
        url: `${apiDomain}/contacts.list`,
        method: RequestMethods.GET,
        body: { page: { size: 20, number: page } }
    };
    // TODO: handle expired access token

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
        return getContacts(apiKey, page + 1, contacts);
    }

    return contacts;
}

export async function deleteContact(apiKey: string, id: string): Promise<void> {
    const { accessToken } = await authorizeApiKey(apiKey);
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

export function getTokens(code: string): Promise<ITeamleaderAuthResponse> {
    const { TEAMLEADER_CLIENT_ID, TEAMLEADER_CLIENT_SECRET, TEAMLEADER_REDIRECT_URL } = parseEnvironment();
    const reqOptions = {
        url: `https://app.teamleader.eu/oauth2/access_token`,
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
    return 'https://app.teamleader.eu/oauth2/authorize?' + querystring.encode({
            client_id: TEAMLEADER_CLIENT_ID,
            response_type: 'code',
            redirect_uri: TEAMLEADER_REDIRECT_URL
        }
    );
}
