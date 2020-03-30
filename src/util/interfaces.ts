export interface ITeamleaderAuthResponse {
    access_token: string,
    refresh_token: string,
    token_type: string,
    expires_in: number
}

interface ITeamleaderContactEmail {
    "type": string,
    "email": string
}

export interface ITeamleaderContactTelephones {
    "type": string,
    "number": string
}

type TTeamleaderContactTags = string | null;

export interface ITeamleaderContact {
    id?: string | null,
    first_name?: string | null,
    last_name: string | null,
    salutation?: string | null,
    emails?: ITeamleaderContactEmail[],
    telephones?: ITeamleaderContactTelephones[],
    website?: string | null,
    primary_address?: {
        line_1: string | null,
        postal_code: string | null,
        city: string | null,
        country: string | null
    },
    gender?: string | null,
    birthdate?: string | null,
    iban?: string | null,
    bic?: string | null,
    national_identification_number?: string | null,
    language?: string | null,
    payment_term?: {
        type: string | null
    },
    invoicing_preferences?: {
        electronic_invoicing_address: string | null
    },
    tags?: TTeamleaderContactTags[],
    added_at?: string | null,
    updated_at?: string | null,
    web_url?: string | null
}

export interface ITeamleaderContactsResponse {
    data: ITeamleaderContact[]
}

export interface ITeamleaderContactResponse {
    data: ITeamleaderContact
}

export interface ITeamleaderUpdateResponse {
    code: number,
    data?: { type: string, id: string },
}

export enum RequestMethods {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
}

export interface IRequest {
    url: string,
    method: RequestMethods,
    headers?: { [ key: string ]: any }
    qs?: { [ key: string ]: any }
}
