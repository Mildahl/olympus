/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
export class EntityIndexBuilder {
    byId = new Map();
    byType = new Map();
    addEntity(ref) {
        this.byId.set(ref.expressId, ref);
        // Add to type index
        let typeList = this.byType.get(ref.type);
        if (!typeList) {
            typeList = [];
            this.byType.set(ref.type, typeList);
        }
        typeList.push(ref.expressId);
    }
    build() {
        return {
            byId: this.byId,
            byType: this.byType,
        };
    }
}
//# sourceMappingURL=entity-index.js.map