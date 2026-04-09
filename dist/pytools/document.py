import ifcopenshell.api.document as document_api
import ifcopenshell.util.element as element_util


class DocumentHandler:
    def __init__(self, version='IFC4'):
        self.version = version

    def get_associated_documents(self, model, element):
        """Get all documents associated with an element via IfcRelAssociatesDocument"""
        documents = []

        # Get all IfcRelAssociatesDocument relationships
        rels = model.by_type("IfcRelAssociatesDocument")

        for rel in rels:
            # Check if this element is in the RelatedObjects
            if element in rel.RelatedObjects:
                # Get the document reference
                doc_ref = rel.RelatingDocument
                if doc_ref and doc_ref.is_a("IfcDocumentReference"):
                    # Get the document information
                    doc_info = doc_ref.ReferencedDocument
                    if doc_info and doc_info.is_a("IfcDocumentInformation"):
                        documents.append({
                            'reference': doc_ref,
                            'information': doc_info,
                            'relationship': rel
                        })

        return documents

    def add_document_information(self, model, attributes=None):
        """Add a new document information"""
        if attributes is None:
            attributes = {}

        return document_api.add_information(model, **attributes)

    def add_document_reference(self, model, information, attributes=None):
        """Add a new document reference"""
        if attributes is None:
            attributes = {}

        return document_api.add_reference(model, information=information, **attributes)

    def assign_document(self, model, products, document):
        """Assign a document to products"""
        return document_api.assign_document(model, products=products, document=document)

    def edit_document_information(self, model, information, attributes):
        """Edit document information attributes"""
        document_api.edit_information(model, information=information, attributes=attributes)

    def edit_document_reference(self, model, reference, attributes):
        """Edit document reference attributes"""
        document_api.edit_reference(model, reference=reference, attributes=attributes)

    def remove_document_information(self, model, information):
        """Remove document information"""
        document_api.remove_information(model, information=information)

    def remove_document_reference(self, model, reference):
        """Remove document reference"""
        document_api.remove_reference(model, reference=reference)

    def unassign_document(self, model, products, document):
        """Unassign document from products"""
        document_api.unassign_document(model, products=products, document=document)