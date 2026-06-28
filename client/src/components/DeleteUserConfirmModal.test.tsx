import { vi } from "vitest";
import { render, screen, fireEvent } from "../test/render";
import DeleteUserConfirmModal from "./DeleteUserConfirmModal";

describe("DeleteUserConfirmModal", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <DeleteUserConfirmModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        userName="Test Agent"
        isDeleting={false}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders warning message with user name when isOpen is true", () => {
    render(
      <DeleteUserConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        userName="Test Agent"
        isDeleting={false}
      />
    );

    expect(screen.getByRole("heading", { name: /delete user account/i })).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    expect(screen.getByText("Test Agent")).toBeInTheDocument();
  });

  it("calls onClose when Cancel button is clicked", () => {
    const onClose = vi.fn();
    render(
      <DeleteUserConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        userName="Test Agent"
        isDeleting={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm when Delete User button is clicked", () => {
    const onConfirm = vi.fn().mockResolvedValue({});
    render(
      <DeleteUserConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        userName="Test Agent"
        isDeleting={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /delete user/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables buttons and displays loader when isDeleting is true", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteUserConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        userName="Test Agent"
        isDeleting={true}
      />
    );

    const deleteBtn = screen.getByRole("button", { name: /deleting…/i });
    const cancelBtn = screen.getByRole("button", { name: /^cancel$/i });

    expect(deleteBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();

    // Clicking should not trigger callbacks
    fireEvent.click(deleteBtn);
    fireEvent.click(cancelBtn);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("displays error message if error prop is provided", () => {
    render(
      <DeleteUserConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        userName="Test Agent"
        isDeleting={false}
        error="Something went wrong while deleting user."
      />
    );

    expect(screen.getByText("Something went wrong while deleting user.")).toBeInTheDocument();
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <DeleteUserConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        userName="Test Agent"
        isDeleting={false}
      />
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose on Escape key press if isDeleting is true", () => {
    const onClose = vi.fn();
    render(
      <DeleteUserConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={vi.fn()}
        userName="Test Agent"
        isDeleting={true}
      />
    );

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
