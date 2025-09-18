import React from 'react'

const Header = () => {

    function callfun(){
        const names=["earns","learns","falls"];
        const int=Math.floor(Math.random()*3);
        return names[int];
    }
    return(
        <p>life always {callfun()}</p>
    )
}

export default Header