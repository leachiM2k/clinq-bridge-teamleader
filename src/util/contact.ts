import { Contact, ContactTemplate, ContactUpdate, PhoneNumber, PhoneNumberLabel } from "@clinq/bridge";
import { ITeamleaderContact } from './interfaces';

export function convertVendorContactToContact(vendorContact: ITeamleaderContact): Contact | null {
    if (!vendorContact.id) {
        return null;
    }

    return {
        id: vendorContact.id,
        name: null,
        firstName: vendorContact.first_name || null,
        lastName: vendorContact.last_name,
        email: collectVendorEmail(vendorContact),
        organization: null,
        contactUrl: vendorContact.web_url || null,
        avatarUrl: null, // TODO
        phoneNumbers: collectPhoneNumbersFromVendorContact(vendorContact)
    };
}

function collectVendorEmail(vendorContact: ITeamleaderContact): string | null {
    if (!Array.isArray(vendorContact.emails) || vendorContact.emails.length === 0) {
        return null;
    }
    const primaryEmail = vendorContact.emails.find(({ type }) => type === 'primary');
    return primaryEmail ? primaryEmail.email : null;
}

function collectPhoneNumbersFromVendorContact(vendorContact: ITeamleaderContact): PhoneNumber[] {
    if (!Array.isArray(vendorContact.telephones) || vendorContact.telephones.length === 0) {
        return [];
    }

    return vendorContact.telephones.map(vendorPhone => {
        let label: PhoneNumberLabel;
        if (vendorPhone.type === 'phone') {
            label = PhoneNumberLabel.WORK;
        } else if (vendorPhone.type === 'mobile') {
            label = PhoneNumberLabel.MOBILE;
        } else if (vendorPhone.type === 'fax') {
            label = 'FAX' as PhoneNumberLabel;
        } else {
            label = 'OTHER' as PhoneNumberLabel;
        }
        return {
            label,
            phoneNumber: vendorPhone.number
        };
    });
}

export function convertContactToVendorContact(contact: ContactUpdate | ContactTemplate, id?: string): ITeamleaderContact {
    const vendorContact: ITeamleaderContact = {
        telephones: [],
        first_name: contact.firstName,
        last_name: contact.lastName
    };

    if (id) {
        vendorContact.id = id;
    }

    if(contact.email) {
        vendorContact.emails = [{ type: 'primary', email: contact.email }];
    }

    if (Array.isArray(contact.phoneNumbers)) {
        vendorContact.telephones = contact.phoneNumbers.map((entry: PhoneNumber) => {
            let type: string = '';
            if (entry.label === PhoneNumberLabel.WORK) {
                type = 'phone';
            } else if (entry.label === PhoneNumberLabel.MOBILE) {
                type = 'mobile';
            } else if (entry.label === 'FAX' as PhoneNumberLabel) {
                type = 'fax';
            }
            return { type, number: entry.phoneNumber };
        });
    }

    return vendorContact;
}
