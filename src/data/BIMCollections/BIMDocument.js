import { Collection } from "./../DataCollections/Collection.js";

export class BIMDocuments extends Collection {
  constructor(pyData) {
    super();

    this.type = 'BIMDocuments';

    this.create(pyData);
  }

  create(data) {

    data.forEach(docData => {
      const document = new BIMDocument(docData);

      this.addItem(document);
    });
  }

  getDocumentById(id) {
    return this.items.find(doc => doc.id === id) || null;
  }
}

export class BIMDocument {
  constructor(data = {}) {
    if (data.reference) {
      
      this.reference = data.reference;

      this.information = data.information;

      this.relationship = data.relationship;
      this.id = data.reference.id();

      this.globalId = data.reference.GlobalId;

      this.name = data.information.Name || '';

      this.identification = data.information.Identification || '';

      this.location = data.information.Location || '';

      this.description = data.information.Description || '';

      this.purpose = data.information.Purpose || '';

      this.intendedUse = data.information.IntendedUse || '';

      this.scope = data.information.Scope || '';

      this.revision = data.information.Revision || '';
      this.referenceId = data.reference.id();

      this.referenceIdentification = data.reference.Identification || '';

      this.referenceName = data.reference.Name || '';

      this.referenceLocation = data.reference.Location || '';

      this.referenceDescription = data.reference.Description || '';
    } else {
      
      this.identification = data.identification || '';

      this.name = data.name || '';

      this.uri = data.uri || '';

      this.id = data.id || this.identification; 
    }
  }

  getDisplayName() {
    return this.name || this.identification || `Document ${this.id}`;
  }

  getURI() {
    return this.uri || this.location || this.referenceLocation || '';
  }

  isURIClickable() {
    const uri = this.getURI();

    return uri && (uri.startsWith('http://') || uri.startsWith('https://') || uri.startsWith('ftp://'));
  }

  updateInformation(attributes) {
    Object.assign(this, attributes);
  }

  updateReference(attributes) {
    if (attributes.Identification !== undefined) this.referenceIdentification = attributes.Identification;

    if (attributes.Name !== undefined) this.referenceName = attributes.Name;

    if (attributes.Location !== undefined) this.referenceLocation = attributes.Location;

    if (attributes.Description !== undefined) this.referenceDescription = attributes.Description;
  }
}