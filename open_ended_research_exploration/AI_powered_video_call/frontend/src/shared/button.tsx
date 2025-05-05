interface ICustomButton {
  type: "normal" | "outlined";
  color: string;
  label: string;
}
const CustomButton = (props: ICustomButton) => {
  const buttonClasses = {
    normal: `px-3 py-3 min-w-[120px] rounded-sm bg-${props.color} text-white`,
    outlined: `px-3 py-3 min-w-[120px] rounded-sm border border-${props.color} text-primary}`,
  };

  return (
    <>
      <button className={buttonClasses[props.type]}>
        {props.label}
      </button>
    </>
  );
};
export default CustomButton;
