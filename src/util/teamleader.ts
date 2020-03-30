import { Contact, ContactTemplate, ContactUpdate } from '@clinq/bridge';
import querystring from 'querystring';
import { authorizeApiKey } from './access-token';
import { convertContactToVendorContact, convertVendorContactToContact } from './contact';
import { ITeamleaderAuthResponse, ITeamleaderContactsResponse, RequestMethods } from './interfaces';
import { isContactResponse, isUpdateResponse, makeRequest } from './make-request';
import parseEnvironment from './parse-environment';

const apiDomain = 'https://api.teamleader.eu';

export async function updateContact(
    apiKey: string,
    apiUrl: string,
    contact: ContactUpdate | ContactTemplate
): Promise<Contact> {
    const { accessToken } = await authorizeApiKey(apiKey);
    const id = (contact as ContactUpdate).id;
    const vendorContactContact = convertContactToVendorContact(contact, id);

    const reqOptions = {
        url: `${apiDomain}/contacts.list`,
        method: id ? RequestMethods.PUT : RequestMethods.POST,
        body: { data: [vendorContactContact] }
    };
    const response = await makeRequest(reqOptions, accessToken);

    if (!response || !isUpdateResponse(response) || response.data.length !== 1) {
        throw new Error("Received unexpected response from Teamleader");
    }

    const [updateEntry] = response.data;
    if (updateEntry.code !== 'SUCCESS') {
        throw new Error(`Could not upsert Teamleader contact: ${updateEntry.message}`);
    }

    const reqGetOptions = {
        url: `${apiDomain}/crm/v2/Contacts/${updateEntry.details.id}`,
        method: RequestMethods.GET,
    };
    const responseGet = await makeRequest(reqGetOptions, accessToken);

    const receivedContact = convertVendorContactToContact((responseGet as ITeamleaderContactsResponse).data[ 0 ]);
    if (!receivedContact) {
        throw new Error("Could not parse received contact");
    }
    return receivedContact;
}

export async function getContacts(
    apiKey: string,
    apiUrl: string,
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
        return getContacts(apiKey, apiUrl, page + 1, contacts);
    }

    return contacts;
}

export async function deleteContact(apiKey: string, apiUrl: string, id: string): Promise<void> {
    const { accessToken } = await authorizeApiKey(apiKey);
    const reqDeleteOptions = {
        url: `${apiDomain}/crm/v2/Contacts/${id}`,
        method: RequestMethods.DELETE,
    };
    const response = await makeRequest(reqDeleteOptions, accessToken);

    if (!response || !isUpdateResponse(response) || response.data.length !== 1) {
        throw new Error("Received unexpected response from Teamleader");
    }

    const [updateEntry] = response.data;
    if (updateEntry.code !== 'SUCCESS') {
        throw new Error(`Could not delete Teamleader contact: ${updateEntry.code} / ${updateEntry.message}`);
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
