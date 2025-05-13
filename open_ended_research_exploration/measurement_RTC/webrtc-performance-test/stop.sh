#!/bin/bash

function clean_file(){
        if [ -f $1 ]
        then
                rm -v $1
        fi
}

# clean previous log file 
if [ $1 == "full" ]
then
        echo "Log cleanup requested too!"
        clean_file "client-log"
fi 

# stop receiver, just in case  
grep_val="receiver.js"
for pid in `ps aux | grep "${grep_val}" | grep "node" | awk '{print $2}'`
do
        sudo kill -9 ${pid}
done

# stop sender, just in case  
grep_val="sender.js"
for pid in `ps aux | grep "${grep_val}" | grep "node" | awk '{print $2}'`
do
        sudo kill -9 ${pid}
done

# stop iperf, just in case  
grep_val="iperf"
for pid in `ps aux | grep "${grep_val}" | grep -v "grep" | awk '{print $2}'`
do
        sudo kill -9 ${pid}
done