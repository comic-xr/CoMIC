import { CreateRoomModal } from "./CreateRoomModal";

export default {
    title: "Modals/CreateRoomModal",
    component: CreateRoomModal,
    parameters: { layout: "fullscreen" },
    argTypes: {
        onCreate: { action: "created" },
        onClose: { action: "closed" },
    },
    decorators: [
        (Story) => (
            <div style={{ height: "100vh", background: "#000" }}>
                <Story />
            </div>
        ),
    ],
};

const mockUsers = [
    { clientId: "1", userName: "Alice Chen", userColor: "#F44336" },
    { clientId: "2", userName: "Bob Smith", userColor: "#2196F3" },
    { clientId: "3", userName: "Carol White", userColor: "#4CAF50" },
    { clientId: "4", userName: "David Lee", userColor: "#9C27B0" },
];

export const Default = {
    args: {
        availableUsers: mockUsers,
    },
};

export const NoUsers = {
    args: {
        availableUsers: [],
    },
};
