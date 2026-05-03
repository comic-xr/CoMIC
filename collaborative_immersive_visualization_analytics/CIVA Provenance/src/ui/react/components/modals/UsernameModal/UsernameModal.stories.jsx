import { UsernameModal } from "./UsernameModal";

export default {
    title: "Modals/UsernameModal",
    component: UsernameModal,
    parameters: { layout: "fullscreen" },
    argTypes: {
        onSubmit: { action: "submitted" },
    },
};

export const Default = {
    args: {},
};
