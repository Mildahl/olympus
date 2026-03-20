import { UIRow } from '../../../../drawUI/ui.js';

/**
 * Settings row matching the General tab: `.ListBoxItem` + `.space-between`
 * (label / primary content left, controls grouped on the right).
 */
function createSettingsListRow() {

	const row = new UIRow();

	row.addClass( 'ListBoxItem' );

	row.addClass( 'space-between' );

	return row;

}

/**
 * Right-aligned control cluster inside a settings row (flex, gap, wrap).
 */
function createSettingsControlsGroup() {

	const group = new UIRow();

	group.gap( '8px' );

	group.dom.style.alignItems = 'center';

	group.dom.style.flexWrap = 'wrap';

	group.dom.style.justifyContent = 'flex-end';

	group.dom.style.flex = '1';

	group.dom.style.minWidth = '0';

	return group;

}

export { createSettingsListRow, createSettingsControlsGroup };
