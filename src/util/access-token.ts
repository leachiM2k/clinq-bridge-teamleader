import { ITeamleaderAuthResponse, RequestMethods } from './interfaces';
import { makeRequest } from './make-request';
import parseEnvironment from './parse-environment';

export async function authorizeApiKey(apiKey: string, refresh: boolean): Promise<{ accessToken: string, refreshToken: string }> {
    if (typeof apiKey !== "string" || !apiKey || apiKey.trim().length === 0) {
        throw new Error("Invalid API key.");
    }
    const [accessToken, refreshToken] = apiKey.split(":");

    if (!refreshToken) {
        throw new Error('Could not extract refresh token from api key');
    }

    if(!refresh) {
        return {accessToken, refreshToken};
    }

    const { access_token, refresh_token } = await getNewAccessToken(refreshToken);
    // TODO: maybe it is worth to cache the access token? (with the refresher token as key)
    return { accessToken: access_token, refreshToken: refresh_token };
}

function getNewAccessToken(refreshToken: string): Promise<ITeamleaderAuthResponse> {
    const { TEAMLEADER_CLIENT_ID, TEAMLEADER_CLIENT_SECRET } = parseEnvironment();
    const reqOptions = {
        url: `https://app.teamleader.eu/oauth2/access_token`,
        method: RequestMethods.POST,
        body: {
            refresh_token: refreshToken,
            client_id: TEAMLEADER_CLIENT_ID,
            client_secret: TEAMLEADER_CLIENT_SECRET,
            grant_type: 'refresh_token'
        }
    };
    return makeRequest(reqOptions) as Promise<ITeamleaderAuthResponse>;
}
