'use client';

import { X, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';


interface Props {
  open: boolean;
  type: 'approve' | 'reject';
  request: any;
  onClose: () => void;
  onConfirm: (note: string) => void;
}


export default function PlanRequestActionModal({
  open,
  type,
  request,
  onClose,
  onConfirm,
}: Props) {


  const [note, setNote] = useState('');



  if (!open) return null;



  return (

    <div className="
      fixed
      inset-0
      z-50
      bg-black/40
      backdrop-blur-sm
      flex
      items-center
      justify-center
      p-4
    ">


      <div className="
        bg-white
        w-full
        max-w-lg
        rounded-3xl
        shadow-xl
        p-8
      ">


        {/* Header */}

        <div className="flex justify-between items-start">


          <div>

            <h2 className="
              text-3xl
              font-bold
              text-slate-900
            ">

              {type === 'approve'
                ? 'Approve Request'
                : 'Reject Request'
              }

            </h2>



            <p className="
              text-slate-400
              mt-2
              text-lg
            ">

              {request.orgName} — {request.requestedPlan} plan

            </p>


          </div>




          <button

            onClick={onClose}

            className="
              w-12
              h-12
              rounded-2xl
              bg-slate-100
              flex
              items-center
              justify-center
            "

          >

            <X className="w-6 h-6 text-slate-500"/>

          </button>



        </div>






        {/* Note */}


        <div className="mt-8">


          <label className="
            text-sm
            font-bold
            tracking-wider
            text-slate-500
          ">

            REVIEW NOTE (OPTIONAL)

          </label>



          <textarea

            value={note}

            onChange={(e)=>setNote(e.target.value)}

            placeholder="Add a note for the organization..."

            className="
              mt-4
              w-full
              h-32
              rounded-2xl
              border
              border-slate-200
              p-5
              text-lg
              outline-none
              resize-none
              focus:ring-2
              focus:ring-blue-500
            "

          />


        </div>






        {/* Action Button */}


        <button

          onClick={()=>onConfirm(note)}

          className={`
            mt-8
            w-full
            py-5
            rounded-2xl
            text-white
            text-xl
            font-bold
            flex
            items-center
            justify-center
            gap-3

            ${
              type === 'approve'
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-red-600 hover:bg-red-700'
            }
          `}

        >

          {
            type === 'approve'
            ?
            <>
              <CheckCircle2/>
              Approve Request
            </>
            :
            <>
              <XCircle/>
              Reject Request
            </>
          }


        </button>



      </div>


    </div>

  );

}