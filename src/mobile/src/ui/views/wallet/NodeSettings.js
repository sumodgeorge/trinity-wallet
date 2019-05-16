import isEqual from 'lodash/isEqual';
import isEmpty from 'lodash/isEmpty';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { withNamespaces } from 'react-i18next';
import { connect } from 'react-redux';
import { StyleSheet, View } from 'react-native';
import { setSetting } from 'shared-modules/actions/wallet';
import { setFullNode, updateQuorumConfig, updateNodeAutoSwitchSetting, updateAutoNodeListSetting } from 'shared-modules/actions/settings';
import { setLoginRoute } from 'shared-modules/actions/ui';
import { getThemeFromState } from 'shared-modules/selectors/global';
import { generateAlert } from 'shared-modules/actions/alerts';
import { MINIMUM_QUORUM_SIZE } from 'shared-modules/config';
import { leaveNavigationBreadcrumb } from 'libs/bugsnag';
import { renderSettingsRows } from 'ui/components/SettingsContent';

const defaultState = {
    autoNodeSelection: true,
    autoNodeList: true,
    nodeAutoSwitch: true,
    quorumEnabled: true,
    quorumSize: '4'
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

/**
 * Advanced Settings component
 */
export class NodeSettings extends PureComponent {
    static propTypes = {
        /** @ignore */
        setSetting: PropTypes.func.isRequired,
        /** @ignore */
        t: PropTypes.func.isRequired,
        /** @ignore */
        node: PropTypes.string.isRequired,
        /** @ignore */
        theme: PropTypes.object.isRequired,
        /** @ignore */
        nodes: PropTypes.array.isRequired,
        /** @ignore */
        customNodes: PropTypes.array.isRequired,
        /** @ignore */
        generateAlert: PropTypes.func.isRequired,
        /** @ignore */
        updateQuorumConfig: PropTypes.func.isRequired,
        /** @ignore */
        updateNodeAutoSwitchSetting: PropTypes.func.isRequired,
        /** @ignore */
        updateAutoNodeListSetting: PropTypes.func.isRequired,
        /** @ignore */
        autoNodeList: PropTypes.bool.isRequired,
        /** @ignore */
        nodeAutoSwitch: PropTypes.bool.isRequired,
        /** @ignore */
        quorumEnabled: PropTypes.bool.isRequired,
        /** @ignore */
        quorumSize: PropTypes.string.isRequired,
        /** @ignore */
        setFullNode: PropTypes.func.isRequired,
        /** @ignore */
        isChangingNode: PropTypes.bool.isRequired,
        /** @ignore */
        setLoginRoute: PropTypes.func.isRequired,
        /** @ignore */
        loginRoute: PropTypes.string.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            autoNodeSelection: props.autoNodeSelection,
            autoNodeList: props.autoNodeList,
            nodeAutoSwitch: props.nodeAutoSwitch,
            quorumEnabled: props.quorumEnabled,
            quorumSize: props.quorumSize,
            node: props.node
        };
    }

    componentDidMount() {
        leaveNavigationBreadcrumb('NodeSettings');
    }

    onApplyPress() {
        const { t } = this.props;
        const { autoNodeList, nodeAutoSwitch, quorumEnabled, node } = this.state;
        const quorumSize = parseInt(this.state.quorumSize);
        if (autoNodeList !== this.props.autoNodeList){
            this.props.updateAutoNodeListSetting(autoNodeList);
        }
        if (nodeAutoSwitch !== this.props.nodeAutoSwitch){
            this.props.updateNodeAutoSwitchSetting(nodeAutoSwitch);
        }
        if (quorumEnabled !== this.props.quorumEnabled || quorumSize !== this.props.quorumSize){
            this.props.updateQuorumConfig({ enabled: quorumEnabled, size: quorumSize });
        }
        if (node !== this.props.node){
            return this.props.setFullNode(node);
        }
        this.props.generateAlert('success', t('nodeSettings:nodeSettingsUpdatedTitle'), t('nodeSettings:nodeSettingsUpdatedExplanation'));
    }

    getQuorumOptions() {
        const { autoNodeList } = this.state;
        const { nodes, customNodes } = this.props;
        const nodeList = autoNodeList ? nodes : customNodes;
        return Array(nodeList.length - 1).fill().map((_, idx) => (MINIMUM_QUORUM_SIZE + idx).toString());
    }

    haveNodeSettingsChanged() {
        const { autoNodeSelection, autoNodeList, nodeAutoSwitch, quorumEnabled, quorumSize, node } = this.props;
        return isEqual({ autoNodeSelection, autoNodeList, nodeAutoSwitch, quorumEnabled, quorumSize, node }, this.state);
    }

    toggleQuorumEnabled() {
        const { t, customNodes, nodes } = this.props;
        const { quorumEnabled, autoNodeList } = this.state;
        if (!quorumEnabled && ((autoNodeList && nodes.length < MINIMUM_QUORUM_SIZE) || (!autoNodeList && customNodes.length < MINIMUM_QUORUM_SIZE))) {
            return this.props.generateAlert('error', t('nodeSettings:nodeEnoughNodesTitle'), autoNodeList ? t('nodeSettings:nodeEnoughNodesExplanation') : `${t('nodeSettings:nodeEnoughNodesExplanation')} ${t('nodeSettings:nodeEnoughNodesExplanationCustomNodes')}`);
        }
        this.setState({ quorumEnabled: !quorumEnabled });
    }

    toggleAutoNodeList() {
        const { autoNodeList } = this.state;
        const { t, customNodes } = this.props;
        if (autoNodeList && isEmpty(customNodes)) {
            return this.props.generateAlert('error', t('nodeSettings:noCustomNodes'), t('nodeSettings:mustAddCustomNodes'));
        }
        if (autoNodeList && customNodes.length < MINIMUM_QUORUM_SIZE) {
            this.setState({ quorumEnabled: false });
        }
        this.setState({ autoNodeList: !autoNodeList });
    }

    toggleAutomaticNodeSelection() {
        if (!this.state.autoNodeSelection) {
            this.setState(defaultState);
        }
        this.setState({ autoNodeSelection: !this.state.autoNodeSelection });
    }

    /**
     * Render setting rows
     *
     * @method renderSettingsContent
     * @returns {function}
     */
    renderSettingsContent() {
        const { theme, t, nodes, isChangingNode, loginRoute } = this.props;
        const { autoNodeSelection, autoNodeList, nodeAutoSwitch, quorumEnabled, quorumSize, node } = this.state;
        const rows = [
            {
                name: t('nodeSettings:automaticNodeSelection'),
                function: () => this.toggleAutomaticNodeSelection(),
                toggle: autoNodeSelection
            },
            {
                name: t('nodeSettings:addCustomNodes'),
                function: () => loginRoute === 'nodeSettings' ? this.props.setLoginRoute('addCustomNode') : this.props.setSetting('addCustomNode'),
            },
            { name: 'separator' },
            {
                name: t('nodeSettings:autoNodeList'),
                function: () => { !autoNodeSelection && this.toggleAutoNodeList(); },
                toggle: autoNodeList,
                inactive: autoNodeSelection
            },
            { name: 'separator', inactive: autoNodeSelection },
            {
                name: t('nodeSettings:nodeAutoswitching'),
                function: () => { !autoNodeSelection && this.setState({ nodeAutoSwitch: !nodeAutoSwitch }); },
                toggle: nodeAutoSwitch,
                inactive: autoNodeSelection
            },
            {
                name: t('nodeSettings:primaryNode'),
                function: (node) => this.setState({ node }),
                inactive: autoNodeSelection || nodeAutoSwitch,
                currentSetting: node,
                dropdownOptions: nodes
            },
            { name: 'separator', inactive: autoNodeSelection },
            {
                name: t('nodeSettings:enableQuorum'),
                function: () => { !autoNodeSelection && this.toggleQuorumEnabled(); },
                toggle: quorumEnabled,
                inactive: autoNodeSelection
            },
            {
                name: t('nodeSettings:quorumSize'),
                function: (quorumSize) => quorumSize && this.setState({ quorumSize }),
                inactive: autoNodeSelection || !quorumEnabled,
                dropdownOptions: this.getQuorumOptions(),
                currentSetting: !quorumEnabled && '0' || quorumSize
            },
            {
                name: 'dualFooter',
                backFunction: () => loginRoute === 'nodeSettings' ? this.props.setLoginRoute('login') : this.props.setSetting('advancedSettings'),
                hideActionButton: this.haveNodeSettingsChanged(),
                actionName: 'Apply',
                actionFunction: () => this.onApplyPress(),
                actionButtonLoading: isChangingNode
            },
        ];
        return renderSettingsRows(rows, theme);
    }

    render() {
        return <View style={styles.container}>{this.renderSettingsContent()}</View>;
    }
}

const mapStateToProps = (state) => ({
    theme: getThemeFromState(state),
    node: state.settings.node,
    nodes: state.settings.nodes,
    customNodes: state.settings.customNodes,
    autoNodeSelection: false,
    nodeAutoSwitch: state.settings.nodeAutoSwitch,
    autoNodeList: state.settings.autoNodeList,
    quorumSize: state.settings.quorum.size.toString(),
    quorumEnabled: state.settings.quorum.enabled,
    isChangingNode: state.ui.isChangingNode,
    loginRoute: state.ui.loginRoute
});

const mapDispatchToProps = {
    setSetting,
    generateAlert,
    updateQuorumConfig,
    updateNodeAutoSwitchSetting,
    updateAutoNodeListSetting,
    setFullNode,
    setLoginRoute
};

export default withNamespaces(['advancedSettings', 'nodeSettings', 'settings', 'global'])(
    connect(mapStateToProps, mapDispatchToProps)(NodeSettings),
);
