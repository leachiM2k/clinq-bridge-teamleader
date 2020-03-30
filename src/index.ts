import {
  Adapter,
  Config,
  Contact,
  ContactTemplate,
  ContactUpdate,
  ServerError,
  start
} from "@clinq/bridge";
import dotenv from "dotenv";
import { Request } from "express";
import { anonymizeKey } from './util/anonymize-key';
import { deleteContact, getContacts, getOAuth2RedirectUrl, getTokens, updateContact } from "./util/teamleader";

dotenv.config();

class TeamleaderAdapter implements Adapter {
  /**
   * validates required config parameters and throws errors
   * @param {Config} config
   * @throws
   */
  private static validateAndReturnRequiredConfigKeys(config: Config): {apiKey: string, apiUrl: string} {
    const apiKey = config.apiKey;
    if (!apiKey) {
      throw new ServerError(400, 'No server key provided');
    }

    const apiUrl = config.apiUrl;
    if (!apiUrl) {
      throw new ServerError(400, 'No server url provided');
    }
    return { apiKey, apiUrl };
  }

  public async getContacts(config: Config): Promise<Contact[]> {
    const { apiKey, apiUrl } = TeamleaderAdapter.validateAndReturnRequiredConfigKeys(config);
    try {
      return await getContacts(apiKey, apiUrl);
    } catch (error) {
      // tslint:disable-next-line:no-console
      console.error(`Could not get contacts for key "${anonymizeKey(apiKey)}"`, error.message);
      throw new ServerError(401, "Unauthorized");
    }
  }

  public async createContact(config: Config, contact: ContactTemplate): Promise<Contact> {
    const { apiKey, apiUrl } = TeamleaderAdapter.validateAndReturnRequiredConfigKeys(config);
    try {
      return updateContact(apiKey, apiUrl, contact);
    } catch (error) {
      // tslint:disable-next-line:no-console
      console.error(`Could not create contact for key "${anonymizeKey(apiKey)}: ${error.message}"`);
      throw new ServerError(500, "Could not create contact");
    }
  }
  public async updateContact(config: Config, id: string, contact: ContactUpdate): Promise<Contact> {
    const { apiKey, apiUrl } = TeamleaderAdapter.validateAndReturnRequiredConfigKeys(config);
    try {
      return updateContact(apiKey, apiUrl, contact);
    } catch (error) {
      // tslint:disable-next-line:no-console
      console.error(`Could not update contact for key "${anonymizeKey(apiKey)}: ${error.message}"`);
      throw new ServerError(500, "Could not update contact");
    }
  }
  public async deleteContact(config: Config, id: string): Promise<void> {
    const { apiKey, apiUrl } = TeamleaderAdapter.validateAndReturnRequiredConfigKeys(config);
    try {
      return deleteContact(apiKey, apiUrl, id);
    } catch (error) {
      // tslint:disable-next-line:no-console
      console.error(`Could not update contact for key "${anonymizeKey(apiKey)}: ${error.message}"`);
      throw new ServerError(500, "Could not update contact");
    }
  }
  /**
   * REQUIRED FOR OAUTH2 FLOW
   * Return the redirect URL for the given contacts provider.
   * Users will be redirected here to authorize CLINQ.
   */
  public async getOAuth2RedirectUrl(): Promise<string> {
    return getOAuth2RedirectUrl();
  }

  /**
   * REQUIRED FOR OAUTH2 FLOW
   * Users will be redirected here after authorizing CLINQ.
   */
  public async handleOAuth2Callback(req: Request): Promise<{ apiKey: string; apiUrl: string }> {
    if (req.query.error) {
      throw new Error('Access denied to Teamleader');
    }

    const { code } = req.query;
    const { access_token, refresh_token } = await getTokens(code);

    return {
      apiKey: `${access_token}:${refresh_token}`,
      apiUrl: ''
    };
  }

}

start(new TeamleaderAdapter());
