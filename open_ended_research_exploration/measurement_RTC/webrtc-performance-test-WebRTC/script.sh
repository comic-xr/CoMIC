

# helper to clean a file if it exists
function clean_file(){
    if [ -f $1 ]
    then 
        rm -v $1
    fi 
}

# helper to stop previous stop pending
function stop_previous(){
    command="cd ${SRC_DIR} && ./stop.sh $1"
    ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"

    # clean previous log file 
    if [ $1 == "full" ]
    then
        echo "Log cleanup requested too!"
        clean_file "server-log"
    fi 

    # stop iperf, just in case  
    grep_val="iperf"
    for pid in `ps aux | grep "${grep_val}" | grep -v "grep" | grep -v "script" | awk '{print $2}'`
    do        
        kill -9 ${pid}
    done

    # stop sender, just in case  
    grep_val="sender.js"
    for pid in `ps aux | grep "${grep_val}" | grep "node" | awk '{print $2}'`
    do
        kill -9 ${pid}
    done

    # stop controller, just in case  
    grep_val="webrtc-controller.js"
    for pid in `ps aux | grep "${grep_val}" | grep "node" | awk '{print $2}'`
    do
        kill -9 ${pid}
    done

    # stop receiver, just in case  
    grep_val="receiver.js"
    for pid in `ps aux | grep "${grep_val}" | grep "node" | awk '{print $2}'`
    do
        kill -9 ${pid}
    done
}

# helper to cleanup things. Ignore <<Error: Cannot delete qdisc with handle of zero.>> if nothing was set
function net_cleanup(){    
    myprint "Net emulation cleanup. Ignore <<Error: Cannot delete qdisc with handle of zero.>> if nothing was set"
    command="sudo tc qdisc del dev ${client_iface} root 2>/dev/null" 
    ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"
    command="sudo tc qdisc del dev ${client_iface} ingress"
    ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"
    command="sudo tc qdisc del dev ifb0 root"
    ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"
    command="sudo ip link set dev ifb0 down"
    ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"
}

# Helper calculate the buffer size
function calculate_buffer_size() {
    local rate_mbit=$1
    local delay_ms=$2
    local margin_percent=$3
    
    # Convert rate from Mbit/s to bit/s
    local rate_bps=$(( rate_mbit * 1000000 ))

    # Convert delay from ms to seconds
    local delay_sec=$(echo "scale=6; $delay_ms / 1000" | bc)

    # Calculate BDP in bits
    local bdp_bits=$(echo "scale=0; $rate_bps * $delay_sec / 1" | bc)

    # Convert BDP from bits to bytes
    local bdp_bytes=$(echo "scale=0; $bdp_bits / 8" | bc)

    # Add margin and ensure minimum buffer size
    local margin_factor=$(echo "scale=2; 1 + $margin_percent / 100" | bc)
    local buffer_size_with_margin=$(echo "scale=0; $bdp_bytes * $margin_factor / 1" | bc)
    
    # Ensure minimum buffer size (e.g., 4KB)
    local min_buffer=4096
    if [ ${buffer_size_with_margin} -lt ${min_buffer} ]; then
        buffer_size_with_margin=${min_buffer}
    fi
    echo $buffer_size_with_margin
}

# Helper for better logging
function myprint(){
    timestamp=`date +%s`
    val=$1
    if [ $# -eq  0 ]
    then
        return 
    fi
    echo -e "\033[32m[$0][$timestamp]\t${val}\033[0m"      
}

# trap ctrl-c and call ctrl_c()
trap ctrl_c INT
function ctrl_c() {
    myprint "Trapped CTRL-C. Stop and cleanup"
    #stop_previous "partial" 
    net_cleanup

    # all done
    exit -1 
}

# fixed parameters
ssh_client="192.168.1.102"
ssh_client_port="22"
client_iface="c4:35:d9:b6:29:02"
client_IP="192.168.1.158"
SRC_DIR="./webrtc-performance-test"
OCT_USER="karthikkumarsamala"
BUFFER_SIZE=-1
TIMEOUT=300 
target_duration=30
useTCPDUMP="false"
key="~/.ssh/id_rsa"
use_iperf="false"
just_cleanup="false"
TCP_CC="cubic"
iperf_receiver="192.168.1.244"
webrtc_server="192.168.1.217"
webrtc_port="4000"
test_video="video1.mp4" #"test-video-720p.mp4"
rate=10   # Mbps
delay=50  # ms
loss=0    # %

# Function to display usage information
usage() {
    echo "Usage: $0 [-D|--delay DELAY] [-l|--loss LOSS] [-r|--rate RATE] [-e|--exp-id EXP_ID] [-b|--buffer-size BUFFER_SIZE] [--ID RUN_ID] [--dur TARGET_DURATION] [--tcpdump] [--iperf] [--clean] [-c|--cc TCP_CC]"  1>&2
    exit 1
}

# Parse command-line options
while [[ $# -gt 0 ]]; do
    case "$1" in
        --opt)
            OPT=$2
            if [[ ! " ${supported_options[@]} " =~ " ${OPT} " ]]
            then
                myprint "Invalid option ${OPT}"
                exit -1 
            fi
            shift
            ;;     
        -c|--cc)
            TCP_CC=$2
            shift
            ;;   
        --ID)
            RUN_ID=$2
            shift
            ;;
        -D|--delay)
            delay=$2
            half_delay=$((delay / 2))
            shift
            ;;
        --dur)
            target_duration=$2
            let "TIMEOUT = target_duration + 10"
            shift
            ;;
        -l|--loss)
            loss=$2
            shift
            ;;
        -r|--rate)
            rate=$2
            shift
            ;;
        -e|--exp-id)
            exp_id=$2
            shift
            ;;
        -h|--help)
            usage
            ;;
        --debug)
            DEBUG="true"
            ;;
        --tcpdump)
            useTCPDUMP="true"
            ;;
        --iperf)    
            use_iperf="true"
            ;; 
        --clean)    
            just_cleanup="true"
            ;; 
        *)
            echo "Unknown option: $1" >&2
            usage
            ;;
    esac
    shift
done

# Cleanup network emulation 
myprint "Network cleanup"
# net_cleanup

# Cleanup any pending process
myprint "Stopping any pending process, and cleaning previous logs (with full option)!"
stop_previous "full"
if [ ${just_cleanup} == "true" ] 
then
    myprint "Just network cleanup was requested!"
    exit -1 
fi 

# Code update 
myprint "Update code remotely..."
command="cd ${SRC_DIR} && git pull"
ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}" &

# local folder organization
res_folder="results/${exp_id}/${RUN_ID}"
if [ -d ${res_folder} ]
then 
    rm -rf ${res_folder}
fi 
mkdir -p ${res_folder}

# Add TCP customization if one want to investigate impact of TCP
use_hystart=0
SHORT_TCP_CC=${TCP_CC}
if [[ "$TCP_CC" == *"hystart"* ]]
then 
    use_hystart=1
    SHORT_TCP_CC=${TCP_CC//_hystart/}
    myprint "Hystart was requested (only used for Cubic)"
fi 

# verify TCP settings (no saving metrics + use window scaling)
myprint "Make sure TCP metrics are not being saved across runs..."
command="sudo sysctl -w net.ipv4.tcp_no_metrics_save=1 && sudo sysctl -w net.ipv4.tcp_adv_win_scale=1"
ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"

# update TCP stack 
myprint "Updating congestion control to ${TCP_CC} at the sender"
command="sudo sysctl -w net.ipv4.tcp_congestion_control=${SHORT_TCP_CC}"
ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"
command="sudo modprobe tcp_${SHORT_TCP_CC}"
ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"
command="sysctl net.ipv4.tcp_congestion_control"
ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"
myprint "Updating hystart (1) or lackof (0)"
command="echo ${use_hystart} | sudo tee /sys/module/tcp_cubic/parameters/hystart"
ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"

# network  emulation 
margin_percent=10  # used to calculate buffer sizing
buffer_size=$(calculate_buffer_size ${rate} ${half_delay} ${margin_percent})

# Calculate limit size (configurable multiplier)
limit_multiplier=1.5
limit_size=$(echo "scale=0; $buffer_size * $limit_multiplier / 1" | bc)

# Calculate netem limit in packets (assuming average packet size of 1500 bytes)
netem_limit=$(echo "scale=0; $limit_size / 1500 + 1" | bc)

# network emulation at the receiver
if [ ${BUFFER_SIZE} != -1 ]
then 
    myprint "Replacing buffer size with: ${BUFFER_SIZE}"
    buffer_size=${BUFFER_SIZE}
    limit_size=${BUFFER_SIZE}
fi 
myprint "Network emulation. Delay:${delay}ms (Half:${half_delay}ms) Loss:${loss}% Rate:${rate}Mbps Buffer:${buffer_size}Bytes Limit:${limit_size}Bytes NetemLimit:${netem_limit}"


command="sudo tc qdisc add dev ${client_iface} root handle 1: netem delay ${half_delay}ms loss ${loss}% limit ${netem_limit}"
ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"
command="sudo tc qdisc add dev ${client_iface} parent 1: handle 10: tbf rate ${rate}Mbit buffer ${buffer_size} limit ${limit_size}"
ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"

# Add ingress (download) limiting rules        
# Load ifb module and set up ifb0 interface
command="sudo modprobe ifb"
ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"
command="sudo ip link set dev ifb0 up"
ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"

# Set up ingress redirect to ifb0
command="sudo tc qdisc add dev ${client_iface} ingress"
ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"
command="sudo tc filter add dev ${client_iface} parent ffff: protocol ip u32 match u32 0 0 action mirred egress redirect dev ifb0"
ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"

# Add rate limiting and netem on ifb0
command="sudo tc qdisc add dev ifb0 root handle 1: netem delay ${half_delay}ms loss 0%"
ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"
command="sudo tc qdisc add dev ifb0 parent 1: handle 10: tbf rate ${rate}Mbit buffer ${buffer_size} limit ${limit_size}"
ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"

# give some time to settle
myprint "Done with net emulation"    
#myprint "temporarily stop for debugging..."
#exit -1 
    
# start the webRTC controller 
if [ ${use_iperf} != "true" ]
then
    myprint "Starting webRTC controller!"
    (node webrtc-controller.js > ${controller_log} 2>&1 &)
fi 

# define log files 
controller_log="${res_folder}/controller-log"
receiver_log="${res_folder}/receiver-log"
sender_log="sender_log"

# start sender/receiver
let "socket_timeout = target_duration*1000 + 5000"    
if [ ${use_iperf} == "true" ]
then 
    myprint "Starting local iperf receiver..."
    iperf3-darwin -s > ${receiver_log} 2>&1 &
    command="cd ${SRC_DIR} && (./socket-monitoring.sh ${socket_timeout} pikachu &) && iperf3 -c ${iperf_receiver} -t ${target_duration} > ${sender_log} 2>&1 &"
    myprint "Starting remote iperf sender. Command: ${command}"
    ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}" &
else 
    command="cd ${SRC_DIR} && (./socket-monitoring.sh ${socket_timeout} pikachu &) && DISPLAY=:0 node sender.js --server http://${webrtc_server}:${webrtc_port} --video ${test_video} --duration ${target_duration} -i matteo > ${sender_log}  2>&1 &"
    myprint "Starting remote sender: ${command}"
    ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}" &
    sleep 1
    myprint "Starting webRTC receiver/sender => <<node receiver.js -s http://${webrtc_server}:${webrtc_port} --duration ${target_duration} -i svarvel>>"    
    node receiver.js -s http://${webrtc_server}:${webrtc_port} --duration ${target_duration} -i svarvel> ${receiver_log} 2>&1 &
fi 

# wait for experiment to be over
sleep 2
t_start=`date +%s`
was_timeout="false"
grep_val="client.py" 
if [ ${use_iperf} == "true" ]
then
    grep_val="iperf3"    
else 
    grep_val="sender.js"    
fi
while true 
do 
    command="ps aux | grep "${grep_val}" | grep -v \"grep\" | grep -v \"bash\" | wc -l"
    ans=`ssh -i ${key} -p ${ssh_client_port} ${OCT_USER}@${ssh_client} "${command}"`
    #ans=`ps aux | grep "${grep_val}" | grep -v "grep" | wc -l`    
    t_end=`date +%s`
    let "t_passed = t_end - t_start"
    myprint "Active clients: ${ans} TimePassed: ${t_passed}"        
    if [ ${ans} -gt 0 ]
    then 
        if [ ${t_passed} -gt ${TIMEOUT} ]
        then 
            myprint "ERROR! TIMEOUT"
            was_timeout="true"
            break
        fi 
        sleep 5 
    else 
        break
    fi 
done

# cleanup any pending process across machines, just in case
stop_previous "partial"

# cleanup network emulation at client and server (unless ongoing experiment)
net_cleanup

# log collection
myprint "Collecting sender logs..."    
scp -i ${key} -P ${ssh_client_port} ${OCT_USER}@${ssh_client}:"${SRC_DIR}/${sender_log}" ${res_folder}
clean_file ".success"
if [ ${use_iperf} == "true" ]
then
    cat ${res_folder}/${sender_log} | grep "receiver" > ".success"
    N=`wc -l ".success"  | awk '{print $1}'`
    goodput=0     
    if [ $N -gt 0 ]
    then         
        file_duration=${target_duration}
        goodput=`cat ".success"  | awk '{print $7}'`
        file_size=`cat ".success"  | awk '{print $5}'`
    else
        myprint "Something is wrong, it seems file was not delivered correctly"
    fi
    
    # logging
    myprint "FileSize:${file_size} Duration:${file_duration} Goodput:${goodput}"

    # get socket stats and parse to save some space
    scp -i ${key} -P ${ssh_client_port} ${OCT_USER}@${ssh_client}:"${SRC_DIR}/pikachu" ${res_folder}/"sender-socket-stats-full"    
    cat ${res_folder}/"sender-socket-stats-full" | awk -v IP=${client_IP} '{if($1=="TIME:"){curr_time=$2} if(shouldLog==1){print curr_time" "$0; shouldLog=0;} if(index($0, ":5201") != 0){shouldLog=1;}}' > ${res_folder}/"sender-socket-stats"     
    rm ${res_folder}/"sender-socket-stats-full"

    # do some TCP plotting
    myprint "Plotting cwnd and more from socket stats..."  
    echo "/usr/bin/python3 cwnd-plot.py ${res_folder}/sender-socket-stats ${file_duration} ${goodput} ${file_size}"  #${json_file} 
    /usr/bin/python3 cwnd-plot.py ${res_folder}/"sender-socket-stats" ${file_duration} ${goodput} ${file_size} #${json_file} 
else 
    myprint "Plotting webrtc collected data..."
    /usr/bin/python3 webrtc-plotter.py ${res_folder}/${sender_log}
fi 

# logging 
myprint "Logs collected. Check folder: ${res_folder}"
myprint "All done!"
